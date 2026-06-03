package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.client.EventCalendarEntry;
import ch.unige.pinfo.notification.client.EventServiceClient;
import ch.unige.pinfo.notification.email.EmailNotificationService;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationPreference;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationPreferenceRepository;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import ch.unige.pinfo.notification.client.RegistrationServiceClient;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ReminderScheduler {

    private static final Logger LOG = Logger.getLogger(ReminderScheduler.class);
    private static final int DEFAULT_LEAD_HOURS = 24;
    private static final int WINDOW_MINUTES = 60;
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    @Inject
    @RestClient
    EventServiceClient eventServiceClient;

    @Inject
    @RestClient
    RegistrationServiceClient registrationServiceClient;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    NotificationPreferenceRepository preferenceRepository;

    @Inject
    EmailNotificationService emailNotificationService;

    @Scheduled(every = "15m")
    @Transactional
    public void sendReminders() {
        // Setup the time window in which the scheduler will check for events starting
        OffsetDateTime now = OffsetDateTime.now();
        int maxLeadHours = Math.max(DEFAULT_LEAD_HOURS, getMaxLeadHours());
        OffsetDateTime windowEnd = now.plusHours(maxLeadHours);

        // For each event
        List<EventCalendarEntry> entries = fetchCalendarEntries(now, windowEnd);
        for (EventCalendarEntry entry : entries) {
            if (entry.eventId == null || entry.time == null) {
                continue;
            }
            if (entry.time.isBefore(now) || entry.time.isAfter(windowEnd)) {
                continue;
            }

            // Fetch confirmed students
            List<UUID> studentIds = registrationServiceClient.getConfirmedStudentIds(entry.eventId);
            if (studentIds == null || studentIds.isEmpty()) {
                continue;
            }

            for (UUID userId : studentIds) {
                if (userId == null) {
                    continue;
                }

                NotificationPreference preferences = getOrCreatePreferences(userId);
                if (preferences.reminderLeadTimeHours <= 0) {
                    continue;
                }

                // Compute target reminder time: time of event - reminderLeadTimeHours
                OffsetDateTime target = entry.time.minusHours(preferences.reminderLeadTimeHours);
                // Skip if 'now' is not within the next 60 minutes after the target
                if (now.isBefore(target) || now.isAfter(target.plusMinutes(WINDOW_MINUTES))) {
                    continue;
                }

                // Skip if a reminder already exists for that user/event
                if (notificationRepository.existsByUserEventType(userId, entry.eventId, NotificationType.REMINDER)) {
                    continue;
                }

                Notification notification = MessagingSupport.buildNotification(
                        userId,
                        entry.eventId,
                        NotificationType.REMINDER,
                        buildReminderBody(entry));
                notificationRepository.persist(notification);
                emailNotificationService.sendIfEnabled(notification);
            }
        }
    }

    private List<EventCalendarEntry> fetchCalendarEntries(OffsetDateTime from, OffsetDateTime to) {
        String fromDate = from.toLocalDate().toString();
        String toDate = to.toLocalDate().toString();
        try {
            return eventServiceClient.getCalendarEntries(fromDate, toDate);
        } catch (Exception e) {
            LOG.warnf(e, "Failed to load calendar entries from %s to %s", fromDate, toDate);
            return List.of();
        }
    }

    private int getMaxLeadHours() {
        Integer max = preferenceRepository.findMaxReminderLeadTimeHours();
        if (max == null) {
            return DEFAULT_LEAD_HOURS;
        }
        return max;
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

    private String buildReminderBody(EventCalendarEntry entry) {
        String time = entry.time != null ? entry.time.format(DISPLAY_TIME) : "TBD";
        String place = entry.place != null ? entry.place : "TBD";
        String title = entry.title != null ? entry.title : "Your event";
        return String.format("Reminder: %s starts at %s at %s.", title, time, place);
    }
}
