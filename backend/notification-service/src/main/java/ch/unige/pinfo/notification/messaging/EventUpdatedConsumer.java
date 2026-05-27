package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.client.RegistrationServiceClient;
import ch.unige.pinfo.notification.email.EmailNotificationService;
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
public class EventUpdatedConsumer {

    private static final Logger LOG = Logger.getLogger(EventUpdatedConsumer.class);
    private static final String UPDATED_BODY = "Event details have been updated.";

    @Inject
    ObjectMapper objectMapper;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    EmailNotificationService emailNotificationService;

    @Inject
    @RestClient
    RegistrationServiceClient registrationServiceClient;

    // On consume event.updated topic, query registrations (via internal REST call
    // to Registration Service) to find all students with CONFIRMED or WAITLISTED
    // status for the event. Create an EVENT_UPDATED Notification record per
    // student, referencing the eventId
    @Incoming("event-updated")
    @Transactional
    public void onEventUpdated(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            if (eventId == null) {
                LOG.warn("event.updated payload missing eventId; skipping notifications");
                return;
            }

            List<String> studentIds = registrationServiceClient.getParticipantStudentIds(eventId);
            if (studentIds == null || studentIds.isEmpty()) {
                LOG.debugf("event.updated: no confirmed or waitlisted registrations for eventId=%s", eventId);
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
                        NotificationType.EVENT_UPDATED,
                        UPDATED_BODY);
                notificationRepository.persist(notification);
                emailNotificationService.sendIfEnabled(notification);
            }

            LOG.debugf("Kafka consume OK: event.updated notified %d students for eventId=%s",
                    studentIds.size(), eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process event.updated");
        }
    }

}
