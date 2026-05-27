package ch.unige.pinfo.notification.resource;

import ch.unige.pinfo.notification.model.NotificationPreference;
import ch.unige.pinfo.notification.openapi.api.PreferencesApi;
import ch.unige.pinfo.notification.openapi.model.NotificationPreferences;
import ch.unige.pinfo.notification.repository.NotificationPreferenceRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@ApplicationScoped
public class PreferencesResource implements PreferencesApi {

    @Inject
    NotificationPreferenceRepository preferenceRepository;

    @Inject
    JsonWebToken jwt;

    @Override
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public NotificationPreferences apiNotificationsPreferencesGet() {
        UUID userId = getUserIdFromJwt();
        NotificationPreference preferences = preferenceRepository.findById(userId);
        // Default preferences are returned if no personal ones were found
        if (preferences == null) {
            preferences = new NotificationPreference();
            preferences.userId = userId;
            preferenceRepository.persist(preferences);
        }
        return toApi(preferences);
    }

    @Override
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public NotificationPreferences apiNotificationsPreferencesPatch(NotificationPreferences notificationPreferences) {
        if (notificationPreferences == null) {
            throw new BadRequestException("Notification preferences payload is required");
        }

        UUID userId = getUserIdFromJwt();
        NotificationPreference preferences = preferenceRepository.findById(userId);
        if (preferences == null) {
            preferences = new NotificationPreference();
            preferences.userId = userId;
        }

        // Only fields present in the request body are updated, omitted fields retain
        // current value
        applyUpdate(preferences, notificationPreferences);
        preferenceRepository.persist(preferences);
        return toApi(preferences);
    }

    private void applyUpdate(NotificationPreference preferences, NotificationPreferences update) {
        if (update.getEmailEnabled() != null) {
            preferences.emailEnabled = update.getEmailEnabled();
        }
        if (update.getEmailOnAnnouncement() != null) {
            preferences.emailOnAnnouncement = update.getEmailOnAnnouncement();
        }
        if (update.getEmailOnEventUpdate() != null) {
            preferences.emailOnEventUpdate = update.getEmailOnEventUpdate();
        }
        if (update.getEmailOnEventCancellation() != null) {
            preferences.emailOnEventCancellation = update.getEmailOnEventCancellation();
        }
        if (update.getEmailOnRegistrationCancelled() != null) {
            preferences.emailOnRegistrationCancelled = update.getEmailOnRegistrationCancelled();
        }
        if (update.getEmailOnWaitlistPromoted() != null) {
            preferences.emailOnWaitlistPromoted = update.getEmailOnWaitlistPromoted();
        }
        if (update.getEmailOnRegistrationConfirmed() != null) {
            preferences.emailOnRegistrationConfirmed = update.getEmailOnRegistrationConfirmed();
        }
        if (update.getEmailOnFreeSlot() != null) {
            preferences.emailOnFreeSlot = update.getEmailOnFreeSlot();
        }
        if (update.getEmailOnReminder() != null) {
            preferences.emailOnReminder = update.getEmailOnReminder();
        }
        if (update.getReminderLeadTimeHours() != null) {
            if (update.getReminderLeadTimeHours() < 0) {
                throw new BadRequestException("reminderLeadTimeHours must be 0 or greater");
            }
            preferences.reminderLeadTimeHours = update.getReminderLeadTimeHours();
        }
    }

    private NotificationPreferences toApi(NotificationPreference preferences) {
        return new NotificationPreferences()
                .emailEnabled(preferences.emailEnabled)
                .emailOnAnnouncement(preferences.emailOnAnnouncement)
                .emailOnEventUpdate(preferences.emailOnEventUpdate)
                .emailOnEventCancellation(preferences.emailOnEventCancellation)
                .emailOnRegistrationCancelled(preferences.emailOnRegistrationCancelled)
                .emailOnWaitlistPromoted(preferences.emailOnWaitlistPromoted)
                .emailOnRegistrationConfirmed(preferences.emailOnRegistrationConfirmed)
                .emailOnFreeSlot(preferences.emailOnFreeSlot)
                .emailOnReminder(preferences.emailOnReminder)
                .reminderLeadTimeHours(preferences.reminderLeadTimeHours);
    }

    private UUID getUserIdFromJwt() {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new NotAuthorizedException(Response.status(Response.Status.UNAUTHORIZED)
                    .entity("JWT subject claim is missing or invalid")
                    .build());
        }

        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(subject.getBytes(StandardCharsets.UTF_8));
        }
    }
}
