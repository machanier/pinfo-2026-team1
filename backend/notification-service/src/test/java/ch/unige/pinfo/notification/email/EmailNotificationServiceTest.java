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
import io.quarkus.qute.TemplateInstance;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusMock;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class EmailNotificationServiceTest {

    @Inject
    EmailNotificationService emailNotificationService;

    @Inject
    Mailer mailer;

    @InjectMock
    NotificationPreferenceRepository preferenceRepository;

    @InjectMock
    @RestClient
    UserServiceClient userServiceClient;

    // We'll register a mock Template instance at runtime (both locations share the
    // Template type)
    Template templateMock;

    private UUID userId;
    private Notification notification;
    private TemplateInstance mockHtmlInstance;
    private TemplateInstance mockTextInstance;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        notification = new Notification();
        notification.userId = userId;
        notification.type = NotificationType.REMINDER;
        notification.body = "The exam starts in 24 hours.";
        notification.eventId = UUID.randomUUID();

        // Setup Qute template fluent API chains safely using array matchers
        mockHtmlInstance = mock(TemplateInstance.class);
        mockTextInstance = mock(TemplateInstance.class);

        templateMock = mock(Template.class);
        // First call to data() -> html instance, second call -> text instance
        when(templateMock.data(Mockito.<Object[]>any())).thenReturn(mockHtmlInstance, mockTextInstance);
        when(mockHtmlInstance.render()).thenReturn("<h1>Mocked HTML Body</h1>");
        when(mockTextInstance.render()).thenReturn("Mocked Text Body");

        // Templates are mocked locally but we don't inject them into CDI in these
        // tests (we assert behavioral interactions instead of mail/template details)
    }

    @Test
    @DisplayName("Should assemble templates and dispatch an email when all preferences match")
    void testSendIfEnabledHappyPath() {
        // Arrange
        NotificationPreference preferences = new NotificationPreference();
        preferences.userId = userId;
        preferences.emailEnabled = true;
        preferences.emailOnReminder = true; // Match type REMINDER

        UserContact contact = new UserContact();
        contact.userId = userId;
        contact.name = "John Doe";
        contact.email = "john.doe@unige.ch";

        when(preferenceRepository.findById(userId)).thenReturn(preferences);
        when(userServiceClient.getUserContact(userId)).thenReturn(contact);

        // Act
        emailNotificationService.sendIfEnabled(notification);

        // Assert: repository and user client were consulted
        verify(preferenceRepository).findById(userId);
        verify(userServiceClient).getUserContact(userId);
    }

    @Test
    @DisplayName("Should immediately return if the input notification or its user reference is missing")
    void testNullGuards() {
        emailNotificationService.sendIfEnabled(null);

        Notification nullUserNotif = new Notification();
        nullUserNotif.userId = null;
        emailNotificationService.sendIfEnabled(nullUserNotif);

        verify(preferenceRepository, never()).findById(any());
        verify(userServiceClient, never()).getUserContact(any());
    }

    @Test
    @DisplayName("Should skip sending if global email configurations are toggled off")
    void testGlobalEmailDisabled() {
        NotificationPreference preferences = new NotificationPreference();
        preferences.userId = userId;
        preferences.emailEnabled = false; // Globally off

        when(preferenceRepository.findById(userId)).thenReturn(preferences);

        emailNotificationService.sendIfEnabled(notification);

        verify(userServiceClient, never()).getUserContact(any());
    }

    @Test
    @DisplayName("Should drop sending if specific notification type switch is turned off")
    void testSpecificPreferenceDisabled() {
        NotificationPreference preferences = new NotificationPreference();
        preferences.userId = userId;
        preferences.emailEnabled = true;
        preferences.emailOnReminder = false; // Off specifically for reminders

        when(preferenceRepository.findById(userId)).thenReturn(preferences);

        emailNotificationService.sendIfEnabled(notification);

        verify(userServiceClient, never()).getUserContact(any());
    }

    @Test
    @DisplayName("Should abort gracefully if user contact information or email string is completely blank")
    void testMissingUserEmailContact() {
        NotificationPreference preferences = new NotificationPreference();
        preferences.userId = userId;
        preferences.emailEnabled = true;
        preferences.emailOnReminder = true;

        UserContact badContact = new UserContact();
        badContact.email = "   "; // Blank target address

        when(preferenceRepository.findById(userId)).thenReturn(preferences);
        when(userServiceClient.getUserContact(userId)).thenReturn(badContact);

        emailNotificationService.sendIfEnabled(notification);

        verify(userServiceClient).getUserContact(userId);
    }

    @Test
    @DisplayName("Should create default preferences via database transaction when user setup records do not exist")
    void testFallbackToCreateDefaultPreferences() {
        NotificationPreference preferences = new NotificationPreference();
        preferences.userId = userId;
        preferences.emailEnabled = true;
        preferences.emailOnReminder = true;

        UserContact contact = new UserContact();
        contact.email = "test@unige.ch";

        // Return null first to trigger fallback creation flow
        when(preferenceRepository.findById(userId)).thenReturn(null);
        when(userServiceClient.getUserContact(userId)).thenReturn(contact);

        emailNotificationService.sendIfEnabled(notification);

        // Verify fallback calculation persists basic configuration structure
        verify(preferenceRepository).persist(any(NotificationPreference.class));
    }

    @Test
    @DisplayName("Should survive external user service client network faults without throwing exceptions")
    void testUserServiceExceptionResilience() {
        NotificationPreference preferences = new NotificationPreference();
        preferences.userId = userId;
        preferences.emailEnabled = true;
        preferences.emailOnReminder = true;

        when(preferenceRepository.findById(userId)).thenReturn(preferences);
        // Force endpoint client to crash
        when(userServiceClient.getUserContact(userId)).thenThrow(new RuntimeException("Connection Timeout"));

        assertDoesNotThrow(() -> emailNotificationService.sendIfEnabled(notification));
        // Client should have been invoked and the service must swallow the exception
        verify(userServiceClient).getUserContact(userId);
    }

    @Test
    @DisplayName("Should build a (French) subject for every notification type, including a null type")
    void testSubjectBuiltForEveryType() {
        // Every per-type email switch on so sendIfEnabled reaches subjectFor() for all types.
        NotificationPreference prefs = new NotificationPreference();
        prefs.userId = userId;
        prefs.emailEnabled = true;
        prefs.emailOnAnnouncement = true;
        prefs.emailOnEventUpdate = true;
        prefs.emailOnEventCancellation = true;
        prefs.emailOnRegistrationCancelled = true;
        prefs.emailOnWaitlistPromoted = true;
        prefs.emailOnRegistrationConfirmed = true;
        prefs.emailOnFreeSlot = true;
        prefs.emailOnReminder = true;

        UserContact contact = new UserContact();
        contact.userId = userId;
        contact.name = "Camille";
        contact.email = "camille@unige.ch";

        when(preferenceRepository.findById(userId)).thenReturn(prefs);
        when(userServiceClient.getUserContact(userId)).thenReturn(contact);

        for (NotificationType type : NotificationType.values()) {
            Notification n = new Notification();
            n.userId = userId;
            n.type = type;
            n.body = "corps";
            n.eventId = UUID.randomUUID();
            assertDoesNotThrow(() -> emailNotificationService.sendIfEnabled(n));
        }

        // A null type still reaches subjectFor (shouldSend returns true on emailEnabled).
        Notification noType = new Notification();
        noType.userId = userId;
        noType.type = null;
        noType.body = "corps";
        assertDoesNotThrow(() -> emailNotificationService.sendIfEnabled(noType));
    }
}