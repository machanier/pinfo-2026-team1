package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.client.RegistrationServiceClient;
import ch.unige.pinfo.notification.email.EmailNotificationService;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction; // 👈 Native programmatic transactions
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EventMessagingConsumer {

    private static final Logger LOG = Logger.getLogger(EventMessagingConsumer.class);
    private static final String ANNOUNCEMENT_MISSING_EVENT_ID = "announcement.posted payload missing eventId; skipping notifications";
    private static final String ANNOUNCEMENT_MISSING_BODY = "announcement.posted payload missing body; skipping notifications";
    private static final String EVENT_CANCELLED_MISSING_EVENT_ID = "event.cancelled payload missing eventId; skipping notifications";
    private static final String EVENT_UPDATED_MISSING_EVENT_ID = "event.updated payload missing eventId; skipping notifications";
    private static final String EVENT_CANCELLED_BODY = "Event has been cancelled.";
    private static final String EVENT_UPDATED_BODY = "Event details have been updated.";

    @Inject
    ObjectMapper objectMapper;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    EmailNotificationService emailNotificationService;

    @Inject
    @RestClient
    RegistrationServiceClient registrationServiceClient;

    @Incoming("announcement-posted")
    // ❌ Removed @Transactional
    public void onAnnouncementPosted(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            String body = payload.hasNonNull("body") ? payload.get("body").asText() : null;

            if (eventId == null) {
                LOG.warn(ANNOUNCEMENT_MISSING_EVENT_ID);
                return;
            }
            if (body == null || body.isBlank()) {
                LOG.warn(ANNOUNCEMENT_MISSING_BODY);
                return;
            }

            List<UUID> studentIds = registrationServiceClient.getConfirmedStudentIds(eventId);
            if (studentIds == null || studentIds.isEmpty()) {
                LOG.debugf("announcement.posted: no confirmed registrations for eventId=%s", eventId);
                return;
            }

            int notified = notifyStudents(studentIds, eventId, NotificationType.ANNOUNCEMENT, body);
            LOG.infof("Kafka consume OK: announcement.posted notified %d students for eventId=%s", notified, eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process announcement.posted");
        }
    }

    @Incoming("event-cancelled")
    // ❌ Removed @Transactional
    public void onEventCancelled(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            JsonNode eventPayload = root.get("event");
            if (eventPayload == null) {
                LOG.warn("event.cancelled payload missing 'event' envelope; skipping notifications.");
                return;
            }

            UUID eventId = MessagingSupport.parseUuid(eventPayload.get("eventId"));
            if (eventId == null) {
                LOG.warn(EVENT_CANCELLED_MISSING_EVENT_ID);
                return;
            }

            List<UUID> studentIds = registrationServiceClient.getParticipantStudentIds(eventId);
            if (studentIds == null || studentIds.isEmpty()) {
                LOG.debugf("event.cancelled: no confirmed or waitlisted registrations for eventId=%s", eventId);
                return;
            }

            int notified = notifyStudents(studentIds, eventId, NotificationType.EVENT_CANCELLED, EVENT_CANCELLED_BODY);
            LOG.infof("Kafka consume OK: event.cancelled notified %d students for eventId=%s", notified, eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process event.cancelled");
        }
    }

    @Incoming("event-updated")
    // ❌ Removed @Transactional
    public void onEventUpdated(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            JsonNode eventPayload = root.get("event");
            if (eventPayload == null) {
                LOG.warn("event.updated payload missing 'event' envelope; skipping notifications.");
                return;
            }

            UUID eventId = MessagingSupport.parseUuid(eventPayload.get("eventId"));
            if (eventId == null) {
                LOG.warn(EVENT_UPDATED_MISSING_EVENT_ID);
                return;
            }

            List<UUID> studentIds = registrationServiceClient.getParticipantStudentIds(eventId);
            if (studentIds == null || studentIds.isEmpty()) {
                LOG.debugf("event.updated: no confirmed or waitlisted registrations for eventId=%s", eventId);
                return;
            }

            int notified = notifyStudents(studentIds, eventId, NotificationType.EVENT_UPDATED, EVENT_UPDATED_BODY);
            LOG.infof("Kafka consume OK: event.updated notified %d students for eventId=%s", notified, eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process event.updated");
        }
    }

    private int notifyStudents(List<UUID> studentIds, UUID eventId, NotificationType type, String body) {
        int notified = 0;
        for (UUID studentId : studentIds) {
            if (studentId == null) {
                continue;
            }

            // Defensive loop context: One student failing won't abort the entire batch
            try {
                // Isolate the DB transaction strictly to the storage operation
                Notification notification = QuarkusTransaction.requiringNew().call(() -> {
                    Notification notif = MessagingSupport.buildNotification(studentId, eventId, type, body);
                    notificationRepository.persist(notif);
                    return notif;
                });

                // Perform outbound REST API/Email operations safely OUTSIDE the transaction
                // block
                emailNotificationService.sendIfEnabled(notification);
                notified++;

            } catch (Exception e) {
                LOG.errorf("Failed to dispatch notification to student=%s for event=%s: %s",
                        studentId, eventId, e.getMessage());
            }
        }
        return notified;
    }
}