package ch.unige.pinfo.notification;

import ch.unige.pinfo.notification.openapi.api.PreferencesApi;
import ch.unige.pinfo.notification.openapi.model.NotificationPreferences;
import jakarta.ws.rs.Path;

@Path("/api/notifications/preferences")
public class NotificationPreferenceResource implements PreferencesApi {

    private static NotificationPreferences current = new NotificationPreferences()
            .emailEnabled(true)
            .emailOnAnnouncement(true)
            .emailOnEventUpdate(true)
            .emailOnEventCancellation(true)
            .emailOnRegistrationConfirmed(true)
            .emailOnFreeSlot(true)
            .reminderLeadTimeHours(24);

    @Override
    public NotificationPreferences apiNotificationsPreferencesGet() {
        return current;
    }

    @Override
    public NotificationPreferences apiNotificationsPreferencesPut(NotificationPreferences notificationPreferences) {
        current = notificationPreferences;
        return current;
    }
}
