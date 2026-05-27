package ch.unige.pinfo.notification.email;

import ch.unige.pinfo.notification.client.UserContact;
import ch.unige.pinfo.notification.client.UserServiceClient;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationPreference;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationPreferenceRepository;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import io.quarkus.qute.Template;
import io.quarkus.qute.Location;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.util.UUID;

@ApplicationScoped
public class EmailNotificationService {

    private static final Logger LOG = Logger.getLogger(EmailNotificationService.class);

    @Inject
    Mailer mailer;

    @Inject
    NotificationPreferenceRepository preferenceRepository;

    @Inject
    @RestClient
    UserServiceClient userServiceClient;

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    @Inject
    @Location("notification-email.html")
    Template htmlTemplate;

    @Inject
    @Location("notification-email.txt")
    Template textTemplate;

    @Transactional
    public void sendIfEnabled(Notification notification) {
        if (notification == null || notification.userId == null) {
            return;
        }

        NotificationPreference preferences = getOrCreatePreferences(notification.userId);
        if (!shouldSend(notification.type, preferences)) {
            return;
        }

        UserContact contact = fetchUserContact(notification.userId);
        if (contact == null || contact.email == null || contact.email.isBlank()) {
            LOG.debugf("Email skipped: missing contact for userId=%s", notification.userId);
            return;
        }

        String subject = subjectFor(notification);
        String typeLabel = formatType(notification.type);
        String htmlBody = htmlTemplate.data(
                "name", contact.name,
                "subject", subject,
                "type", typeLabel,
                "body", notification.body,
                "eventId", notification.eventId)
                .render();
        String textBody = textTemplate.data(
                "name", contact.name,
                "subject", subject,
                "type", typeLabel,
                "body", notification.body,
                "eventId", notification.eventId)
                .render();

        mailer.send(Mail.withHtml(contact.email, subject, htmlBody).setText(textBody));
    }

    private NotificationPreference getOrCreatePreferences(UUID userId) {
        NotificationPreference preferences = preferenceRepository.findById(userId);
        if (preferences != null) {
            return preferences;
        }
        NotificationPreference defaults = new NotificationPreference();
        defaults.userId = userId;
        preferenceRepository.persist(defaults);
        return defaults;
    }

    private boolean shouldSend(NotificationType type, NotificationPreference preferences) {
        if (preferences == null || !preferences.emailEnabled) {
            return false;
        }
        if (type == null) {
            return true;
        }
        return switch (type) {
            case ANNOUNCEMENT -> preferences.emailOnAnnouncement;
            case EVENT_UPDATED -> preferences.emailOnEventUpdate;
            case EVENT_CANCELLED -> preferences.emailOnEventCancellation;
            case REGISTRATION_CANCELLED -> preferences.emailOnRegistrationCancelled;
            case WAITLIST_PROMOTED -> preferences.emailOnWaitlistPromoted;
            case REGISTRATION_CONFIRMED -> preferences.emailOnRegistrationConfirmed;
            case SLOT_AVAILABLE -> preferences.emailOnFreeSlot;
            case REMINDER -> preferences.emailOnReminder;
            default -> true;
        };
    }

    private UserContact fetchUserContact(UUID userId) {
        try {
            return userServiceClient.getUserContact(userId, internalServiceKey);
        } catch (Exception e) {
            LOG.warnf(e, "Failed to load contact for userId=%s", userId);
            return null;
        }
    }

    private String subjectFor(Notification notification) {
        NotificationType type = notification.type;
        if (type == null) {
            return "New notification";
        }
        return switch (type) {
            case ANNOUNCEMENT -> "New announcement";
            case EVENT_UPDATED -> "Event updated";
            case EVENT_CANCELLED -> "Event cancelled";
            case REGISTRATION_CONFIRMED -> "Registration confirmed";
            case REGISTRATION_CANCELLED -> "Registration cancelled";
            case WAITLIST_PROMOTED -> "Waitlist update";
            case REMINDER -> "Event reminder";
            case SLOT_AVAILABLE -> "Slot available";
        };
    }

    private String formatType(NotificationType type) {
        if (type == null) {
            return "Notification";
        }
        String label = type.name().toLowerCase().replace('_', ' ');
        return Character.toUpperCase(label.charAt(0)) + label.substring(1);
    }
}
