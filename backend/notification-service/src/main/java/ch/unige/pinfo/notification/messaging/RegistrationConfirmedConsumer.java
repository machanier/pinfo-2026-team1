package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.email.EmailNotificationService;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.UUID;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class RegistrationConfirmedConsumer {

    private static final Logger LOG = Logger.getLogger(RegistrationConfirmedConsumer.class);
    private static final String CONFIRMED_BODY = "Your registration has been confirmed.";

    @Inject
    ObjectMapper objectMapper;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    EmailNotificationService emailNotificationService;

    // On consume registration.confirmed topic, create a REGISTRATION_CONFIRMED
    // Notification record for the student.
    @Incoming("registration-confirmed")
    @Transactional
    public void onRegistrationConfirmed(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            UUID userId = MessagingSupport.parseUuid(payload.get("studentId"));

            if (userId == null) {
                LOG.warn("registration.confirmed payload missing studentId; skipping notification");
                return;
            }

            Notification notification = MessagingSupport.buildNotification(
                    userId,
                    eventId,
                    NotificationType.REGISTRATION_CONFIRMED,
                    CONFIRMED_BODY);
            notificationRepository.persist(notification);
            emailNotificationService.sendIfEnabled(notification);

            LOG.debugf("Kafka consume OK: registration.confirmed for userId=%s eventId=%s", userId, eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.confirmed");
        }
    }
}
