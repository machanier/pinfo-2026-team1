package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import ch.unige.pinfo.notification.email.EmailNotificationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class RegistrationCancelledConsumer {

    private static final Logger LOG = Logger.getLogger(RegistrationCancelledConsumer.class);

    private static final String CANCELLED_BODY = "Your registration has been cancelled.";
    private static final String SLOT_AVAILABLE_BODY = "A slot is now available.";

    @Inject
    ObjectMapper objectMapper;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    EmailNotificationService emailNotificationService;

    // On consume registration.cancelled topic, create a REGISTRATION_CANCELLED
    // Notification record for the cancelling student. For each studentId in
    // waitlistedStudentIds, create a SLOT_AVAILABLE Notification record if
    // availableSlots > 0.
    @Incoming("registration-cancelled")
    @Transactional
    public void onRegistrationCancelled(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            UUID studentId = MessagingSupport.parseUuid(payload.get("studentId")); // The cancelling student's id
            int availableSlots = payload.hasNonNull("availableSlots")
                    ? payload.get("availableSlots").asInt()
                    : 0;

            if (studentId != null) {
                Notification notification = MessagingSupport.buildNotification(
                        studentId,
                        eventId,
                        NotificationType.REGISTRATION_CANCELLED,
                        CANCELLED_BODY);
                notificationRepository.persist(notification);
                emailNotificationService.sendIfEnabled(notification);
            } else {
                LOG.warn("registration.cancelled payload missing studentId; skipping cancellation notification");
            }

            if (availableSlots > 0) {
                List<UUID> waitlistedStudentIds = parseWaitlistedStudentIds(payload.get("waitlistedStudentIds"));
                for (UUID waitlistedStudentId : waitlistedStudentIds) {
                    Notification notification = MessagingSupport.buildNotification(
                            waitlistedStudentId,
                            eventId,
                            NotificationType.SLOT_AVAILABLE,
                            SLOT_AVAILABLE_BODY);
                    notificationRepository.persist(notification);
                        emailNotificationService.sendIfEnabled(notification);
                }
                LOG.debugf("Kafka consume OK: registration.cancelled, %d waitlisted notified",
                        waitlistedStudentIds.size());
            } else {
                LOG.debug("Kafka consume OK: registration.cancelled, no slots available for waitlist");
            }
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.cancelled");
        }
    }

    private List<UUID> parseWaitlistedStudentIds(JsonNode node) {
        List<UUID> results = new ArrayList<>();
        if (node == null || node.isNull() || !node.isArray()) {
            return results;
        }
        for (JsonNode entry : node) {
            UUID userId = MessagingSupport.parseUuid(entry);
            if (userId != null) {
                results.add(userId);
            }
        }
        return results;
    }
}
