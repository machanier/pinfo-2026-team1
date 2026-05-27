package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationConfirmedConsumerTest {

    @Inject
    RegistrationConfirmedConsumer consumer;

    @InjectMock
    NotificationRepository notificationRepository;

    @BeforeEach
    void setUp() {
        reset(notificationRepository);
    }

    @Test
    void onRegistrationConfirmed_persistsNotification() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID registrationId = UUID.randomUUID();

        String message = "{" +
                "\"registrationId\":\"" + registrationId + "\"," +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"" +
                "}";

        OffsetDateTime before = OffsetDateTime.now();
        consumer.onRegistrationConfirmed(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).persist(captor.capture());

        Notification persisted = captor.getValue();
        assertNotNull(persisted.notificationId);
        assertEquals(studentId, persisted.userId);
        assertEquals(eventId, persisted.eventId);
        assertEquals(NotificationType.REGISTRATION_CONFIRMED, persisted.type);
        assertEquals("Your registration has been confirmed.", persisted.body);
        assertFalse(persisted.read);
        assertNotNull(persisted.createdAt);
        assertFalse(persisted.createdAt.isBefore(before));
    }

    @Test
    void onRegistrationConfirmed_missingStudentId_skipsPersist() {
        UUID eventId = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"" +
                "}";

        consumer.onRegistrationConfirmed(message);

        verify(notificationRepository, never()).persist(any(Notification.class));
    }

    @Test
    void onRegistrationConfirmed_invalidUuids_useNameUuidFromBytes() {
        String eventId = "event-xyz";
        String studentId = "auth0|student";

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"" +
                "}";

        consumer.onRegistrationConfirmed(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).persist(captor.capture());

        Notification persisted = captor.getValue();
        assertEquals(UUID.nameUUIDFromBytes(eventId.getBytes(StandardCharsets.UTF_8)), persisted.eventId);
        assertEquals(UUID.nameUUIDFromBytes(studentId.getBytes(StandardCharsets.UTF_8)), persisted.userId);
    }
}
