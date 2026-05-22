package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.client.RegistrationServiceClient;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AnnouncementPostedConsumer {

    private static final Logger LOG = Logger.getLogger(AnnouncementPostedConsumer.class);

    @Inject
    ObjectMapper objectMapper;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    @RestClient
    RegistrationServiceClient registrationServiceClient;

    // On consume announcement.posted topic, query registrations (via internal REST
    // call to Registration Service) to find all students with CONFIRMED status for
    // the event. Create an ANNOUNCEMENT Notification record per student, including
    // the announcement body in the notification body.
    @Incoming("announcement-posted")
    @Transactional
    public void onAnnouncementPosted(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            String body = payload.hasNonNull("body") ? payload.get("body").asText() : null;

            if (eventId == null) {
                LOG.warn("announcement.posted payload missing eventId; skipping notifications");
                return;
            }
            if (body == null || body.isBlank()) {
                LOG.warn("announcement.posted payload missing body; skipping notifications");
                return;
            }

            List<String> studentIds = registrationServiceClient.getConfirmedStudentIds(eventId);
            if (studentIds == null || studentIds.isEmpty()) {
                LOG.debugf("announcement.posted: no confirmed registrations for eventId=%s", eventId);
                return;
            }

            for (String studentId : studentIds) {
                UUID userId = MessagingSupport.parseUuid(studentId);
                if (userId == null) {
                    continue;
                }
                Notification notification = MessagingSupport.buildNotification(
                        userId,
                        eventId,
                        NotificationType.ANNOUNCEMENT,
                        body);
                notificationRepository.persist(notification);
            }

            LOG.debugf("Kafka consume OK: announcement.posted notified %d students for eventId=%s",
                    studentIds.size(), eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process announcement.posted");
        }
    }

}
