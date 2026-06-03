package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.client.EventCalendarEntry;
import ch.unige.pinfo.notification.client.EventServiceClient;
import ch.unige.pinfo.notification.client.RegistrationServiceClient;
import ch.unige.pinfo.notification.email.EmailNotificationService;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationPreference;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationPreferenceRepository;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.InjectMock;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class ReminderSchedulerTest {

    @Inject
    ReminderScheduler reminderScheduler;

    @InjectMock
    @RestClient
    EventServiceClient eventServiceClient;

    @InjectMock
    @RestClient
    RegistrationServiceClient registrationServiceClient;

    @InjectMock
    NotificationRepository notificationRepository;

    @InjectMock
    NotificationPreferenceRepository preferenceRepository;

    @InjectMock
    EmailNotificationService emailNotificationService;

    private UUID sampleEventId;
    private UUID sampleStudentId;
    private OffsetDateTime baseTime;

    @BeforeEach
    void setUp() {
        sampleEventId = UUID.randomUUID();
        sampleStudentId = UUID.randomUUID();
        baseTime = OffsetDateTime.now();

        // Standard stubbing behavior for fallback properties
        when(preferenceRepository.findMaxReminderLeadTimeHours()).thenReturn(24);
    }

    @Test
    @DisplayName("Should successfully send email and save notification for valid upcoming event matching user preferences")
    void testSendRemindersHappyPath() {
        // Arrange: Set event to happen exactly 24 hours from now
        EventCalendarEntry entry = new EventCalendarEntry();
        entry.eventId = sampleEventId;
        entry.title = "Software Architecture Exam";
        entry.place = "Auditoire Dufour";
        entry.time = baseTime.plusHours(24);

        NotificationPreference preference = new NotificationPreference();
        preference.userId = sampleStudentId;
        preference.reminderLeadTimeHours = 24; // Match the lead window perfectly

        when(eventServiceClient.getCalendarEntries(anyString(), anyString()))
                .thenReturn(List.of(entry));
        when(registrationServiceClient.getConfirmedStudentIds(sampleEventId))
                .thenReturn(List.of(sampleStudentId));
        when(preferenceRepository.findById(sampleStudentId))
                .thenReturn(preference);
        when(notificationRepository.existsByUserEventType(sampleStudentId, sampleEventId, NotificationType.REMINDER))
                .thenReturn(false);

        // Act
        reminderScheduler.sendReminders();

        // Assert
        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).persist(notificationCaptor.capture());

        Notification capturedNotification = notificationCaptor.getValue();
        assertEquals(sampleStudentId, capturedNotification.userId);
        assertEquals(sampleEventId, capturedNotification.eventId);
        assertEquals(NotificationType.REMINDER, capturedNotification.type);
        assertTrue(capturedNotification.body.contains("Software Architecture Exam"));

        verify(emailNotificationService).sendIfEnabled(capturedNotification);
    }

    @Test
    @DisplayName("Should create default preferences if user does not have any saved profiles")
    void testCreateDefaultPreferencesWhenMissing() {
        EventCalendarEntry entry = new EventCalendarEntry();
        entry.eventId = sampleEventId;
        entry.time = baseTime.plusHours(24);

        when(eventServiceClient.getCalendarEntries(anyString(), anyString())).thenReturn(List.of(entry));
        when(registrationServiceClient.getConfirmedStudentIds(sampleEventId)).thenReturn(List.of(sampleStudentId));

        // Return null to trigger the getOrCreatePreferences default fallback path
        when(preferenceRepository.findById(sampleStudentId)).thenReturn(null);

        reminderScheduler.sendReminders();

        // Verify fallback profile initialization took place
        verify(preferenceRepository).persist(any(NotificationPreference.class));
    }

    @Test
    @DisplayName("Should skip event matching if the event window properties are invalid or missing")
    void testFiltersInvalidEntries() {
        EventCalendarEntry invalidEntry = new EventCalendarEntry();
        invalidEntry.eventId = null; // Bad setup
        invalidEntry.time = null;

        when(eventServiceClient.getCalendarEntries(anyString(), anyString())).thenReturn(List.of(invalidEntry));

        reminderScheduler.sendReminders();

        verify(registrationServiceClient, never()).getConfirmedStudentIds(any());
    }

    @Test
    @DisplayName("Should skip operations completely if a reminder has already been created for that context")
    void testAvoidDuplicateReminders() {
        EventCalendarEntry entry = new EventCalendarEntry();
        entry.eventId = sampleEventId;
        entry.time = baseTime.plusHours(24);

        NotificationPreference preference = new NotificationPreference();
        preference.userId = sampleStudentId;
        preference.reminderLeadTimeHours = 24;

        when(eventServiceClient.getCalendarEntries(anyString(), anyString())).thenReturn(List.of(entry));
        when(registrationServiceClient.getConfirmedStudentIds(sampleEventId)).thenReturn(List.of(sampleStudentId));
        when(preferenceRepository.findById(sampleStudentId)).thenReturn(preference);

        // Sabotage path: Tell system record already exists
        when(notificationRepository.existsByUserEventType(sampleStudentId, sampleEventId, NotificationType.REMINDER))
                .thenReturn(true);

        reminderScheduler.sendReminders();

        verify(notificationRepository, never()).persist(any(Notification.class));
        verify(emailNotificationService, never()).sendIfEnabled(any());
    }

    @Test
    @DisplayName("Should catch external Rest API exceptions gracefully without crashing processing runtime threads")
    void testResilienceAgainstClientExceptions() {
        // Force client query to blow up completely
        when(eventServiceClient.getCalendarEntries(anyString(), anyString()))
                .thenThrow(new RuntimeException("Remote Gateway Down Error"));

        assertDoesNotThrow(() -> reminderScheduler.sendReminders());

        // Verify code aborted loop gracefully immediately following failure
        verify(registrationServiceClient, never()).getConfirmedStudentIds(any());
    }
}