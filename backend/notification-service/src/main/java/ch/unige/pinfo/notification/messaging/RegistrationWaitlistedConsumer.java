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

import java.util.UUID;

@ApplicationScoped
public class RegistrationWaitlistedConsumer {

    private static final Logger LOG = Logger.getLogger(RegistrationWaitlistedConsumer.class);

    @Inject
    ObjectMapper objectMapper;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    EmailNotificationService emailNotificationService;

    // On consume registration.waitlisted topic, create a WAITLIST_PROMOTED
    // Notification record for the student including their waitlist position in the
    // body
    @Incoming("registration-waitlisted")
    @Transactional
    public void onRegistrationWaitlisted(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            UUID userId = MessagingSupport.parseUuid(payload.get("studentId"));
            int waitlistPosition = payload.hasNonNull("waitlistPosition")
                    ? payload.get("waitlistPosition").asInt()
                    : -1;

            if (userId == null) {
                LOG.warn("registration.waitlisted payload missing studentId; skipping notification");
                return;
            }

            Notification notification = MessagingSupport.buildNotification(
                    userId,
                    eventId,
                    NotificationType.WAITLIST_PROMOTED,
                    buildBody(waitlistPosition));

            notificationRepository.persist(notification);
                emailNotificationService.sendIfEnabled(notification);
            LOG.debugf("Kafka consume OK: registration.waitlisted for userId=%s eventId=%s", userId, eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.waitlisted");
        }
    }

    private String buildBody(int waitlistPosition) {
        if (waitlistPosition > 0) {
            return "Waitlist position: " + waitlistPosition;
        }
        return "You have been added to the waitlist.";
    }
}
