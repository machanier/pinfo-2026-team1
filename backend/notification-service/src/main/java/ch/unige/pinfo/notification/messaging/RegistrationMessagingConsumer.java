package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.email.EmailNotificationService;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class RegistrationMessagingConsumer {

    private static final Logger LOG = Logger.getLogger(RegistrationMessagingConsumer.class);
    private static final String CONFIRMED_BODY = "Votre inscription a été confirmée.";
    private static final String CANCELLED_BODY = "Votre inscription a été annulée.";
    private static final String SLOT_AVAILABLE_BODY = "Une place s'est libérée.";
    private static final String WAITLISTED_MISSING_STUDENT_ID = "registration.waitlisted payload missing studentId; skipping notification";
    private static final String CONFIRMED_MISSING_STUDENT_ID = "registration.confirmed payload missing studentId; skipping notification";
    private static final String CANCELLED_MISSING_STUDENT_ID = "registration.cancelled payload missing studentId; skipping cancellation notification";

    @Inject
    ObjectMapper objectMapper;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    EmailNotificationService emailNotificationService;

    @Incoming("registration-confirmed")
    public void onRegistrationConfirmed(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            UUID userId = MessagingSupport.parseUuid(payload.get("studentId"));

            if (userId == null) {
                LOG.warn(CONFIRMED_MISSING_STUDENT_ID);
                return;
            }

            // Isolate database persist to its own short transaction
            Notification notification = QuarkusTransaction.requiringNew().call(() -> {
                Notification notif = MessagingSupport.buildNotification(
                        userId, eventId, NotificationType.REGISTRATION_CONFIRMED, CONFIRMED_BODY);
                notificationRepository.persist(notif);
                return notif;
            });

            // Network operations safely outside the transaction boundary
            emailNotificationService.sendIfEnabled(notification);
            LOG.infof("Kafka consume OK: registration.confirmed for userId=%s eventId=%s", userId, eventId);

        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.confirmed");
        }
    }

    @Incoming("registration-cancelled")
    public void onRegistrationCancelled(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            UUID studentId = MessagingSupport.parseUuid(payload.get("studentId"));
            int availableSlots = payload.hasNonNull("availableSlots") ? payload.get("availableSlots").asInt() : 0;

            // Notify the student who cancelled
            if (studentId != null) {
                try {
                    Notification notification = QuarkusTransaction.requiringNew().call(() -> {
                        Notification notif = MessagingSupport.buildNotification(
                                studentId, eventId, NotificationType.REGISTRATION_CANCELLED, CANCELLED_BODY);
                        notificationRepository.persist(notif);
                        return notif;
                    });
                    emailNotificationService.sendIfEnabled(notification);
                } catch (Exception e) {
                    LOG.errorf("Failed to send cancellation notification to student=%s: %s", studentId, e.getMessage());
                }
            } else {
                LOG.warn(CANCELLED_MISSING_STUDENT_ID);
            }

            // Notify the waitlisted students if slots opened up
            if (availableSlots > 0) {
                List<UUID> waitlistedStudentIds = parseWaitlistedStudentIds(payload.get("waitlistedStudentIds"));

                for (UUID waitlistedStudentId : waitlistedStudentIds) {
                    // Inner try-catch protects the loop from one bad/missing student record
                    try {
                        Notification notification = QuarkusTransaction.requiringNew().call(() -> {
                            Notification notif = MessagingSupport.buildNotification(
                                    waitlistedStudentId, eventId, NotificationType.SLOT_AVAILABLE, SLOT_AVAILABLE_BODY);
                            notificationRepository.persist(notif);
                            return notif;
                        });
                        emailNotificationService.sendIfEnabled(notification);
                    } catch (Exception e) {
                        LOG.errorf("Failed to send slot available notification to waitlisted student=%s: %s",
                                waitlistedStudentId, e.getMessage());
                    }
                }
                LOG.infof("Kafka consume OK: registration.cancelled, %d waitlisted notified",
                        waitlistedStudentIds.size());
            } else {
                LOG.debug("Kafka consume OK: registration.cancelled, no slots available for waitlist");
            }
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.cancelled");
        }
    }

    @Incoming("registration-waitlisted")
    public void onRegistrationWaitlisted(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            UUID eventId = MessagingSupport.parseUuid(payload.get("eventId"));
            UUID userId = MessagingSupport.parseUuid(payload.get("studentId"));
            int waitlistPosition = payload.hasNonNull("waitlistPosition") ? payload.get("waitlistPosition").asInt()
                    : -1;

            if (userId == null) {
                LOG.warn(WAITLISTED_MISSING_STUDENT_ID);
                return;
            }

            // Isolate database persist to its own short transaction
            Notification notification = QuarkusTransaction.requiringNew().call(() -> {
                Notification notif = MessagingSupport.buildNotification(
                        userId, eventId, NotificationType.WAITLIST_PROMOTED, buildBody(waitlistPosition));
                notificationRepository.persist(notif);
                return notif;
            });

            emailNotificationService.sendIfEnabled(notification);
            LOG.infof("Kafka consume OK: registration.waitlisted for userId=%s eventId=%s", userId, eventId);

        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.waitlisted");
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

    private String buildBody(int waitlistPosition) {
        if (waitlistPosition > 0) {
            return "Position en liste d'attente : " + waitlistPosition;
        }
        return "Vous avez été ajouté·e à la liste d'attente.";
    }
}