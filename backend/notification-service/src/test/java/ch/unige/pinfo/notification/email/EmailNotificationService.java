package ch.unige.pinfo.notification.email;

import ch.unige.pinfo.notification.client.UserContact;
import ch.unige.pinfo.notification.client.UserServiceClient;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationPreference;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationPreferenceRepository;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.qute.TemplateInstance;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.InjectMock;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

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

    @InjectMock
    Mailer mailer;

    @InjectMock
    NotificationPreferenceRepository preferenceRepository;

    @InjectMock
    @RestClient
    UserServiceClient userServiceClient;

    @InjectMock
    @Location("notification-email.html")
    Template htmlTemplate;

    @InjectMock
    @Location("notification-email.txt")
    Template textTemplate;

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

        when(htmlTemplate.data(any(Object[].class))).thenReturn(mockHtmlInstance);
        when(mockHtmlInstance.render()).thenReturn("<h1>Mocked HTML Body</h1>");

        when(textTemplate.data(any(Object[].class))).thenReturn(mockTextInstance);
        when(mockTextInstance.render()).thenReturn("Mocked Text Body");
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

        // Assert
        ArgumentCaptor<Mail> mailCaptor = ArgumentCaptor.forClass(Mail.class);
        verify(mailer).send(mailCaptor.capture());

        Mail sentMail = mailCaptor.getValue();
        assertEquals("john.doe@unige.ch", sentMail.getTo().get(0));
        assertEquals("Event reminder", sentMail.getSubject());
        assertEquals("<h1>Mocked HTML Body</h1>", sentMail.getHtml());
        assertEquals("Mocked Text Body", sentMail.getText());
    }

    @Test
    @DisplayName("Should immediately return if the input notification or its user reference is missing")
    void testNullGuards() {
        emailNotificationService.sendIfEnabled(null);

        Notification nullUserNotif = new Notification();
        nullUserNotif.userId = null;
        emailNotificationService.sendIfEnabled(nullUserNotif);

        verify(preferenceRepository, never()).findById(any());
        verify(mailer, never()).send(any());
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
        verify(mailer, never()).send(any());
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

        verify(mailer, never()).send(any());
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
        verify(mailer).send(any(Mail.class));
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
        verify(mailer, never()).send(any());
    }
}