package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationWaitlistedConsumerTest {

    @Inject
    RegistrationWaitlistedConsumer consumer;

    @InjectMock
    NotificationRepository notificationRepository;

    @BeforeEach
    void setUp() {
        reset(notificationRepository);
    }

    @Test
    void onRegistrationWaitlisted_persistsNotification_withWaitlistPosition() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"," +
                "\"waitlistPosition\":3" +
                "}";

        OffsetDateTime before = OffsetDateTime.now();
        consumer.onRegistrationWaitlisted(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).persist(captor.capture());

        Notification persisted = captor.getValue();
        assertNotNull(persisted);
        assertNotNull(persisted.notificationId);
        assertEquals(studentId, persisted.userId);
        assertEquals(NotificationType.WAITLIST_PROMOTED, persisted.type);
        assertEquals(eventId, persisted.eventId);
        assertEquals("Waitlist position: 3", persisted.body);
        assertFalse(persisted.read);
        assertNotNull(persisted.createdAt);
        assertTrue(!persisted.createdAt.isBefore(before));
    }

    @Test
    void onRegistrationWaitlisted_missingStudentId_skipsPersist() {
        UUID eventId = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"waitlistPosition\":1" +
                "}";

        consumer.onRegistrationWaitlisted(message);

        verify(notificationRepository, never()).persist(any(Notification.class));
    }

    @Test
    void onRegistrationWaitlisted_invalidUuids_useNameUuidFromBytes() {
        String eventId = "not-a-uuid";
        String studentId = "abc";

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"," +
                "\"waitlistPosition\":null" +
                "}";

        consumer.onRegistrationWaitlisted(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).persist(captor.capture());

        Notification persisted = captor.getValue();
        assertNotNull(persisted);
        assertEquals(UUID.nameUUIDFromBytes(eventId.getBytes(StandardCharsets.UTF_8)), persisted.eventId);
        assertEquals(UUID.nameUUIDFromBytes(studentId.getBytes(StandardCharsets.UTF_8)), persisted.userId);
        assertEquals("You have been added to the waitlist.", persisted.body);
    }

    @Test
    void onRegistrationWaitlisted_waitlistPositionZero_usesDefaultBody() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"," +
                "\"waitlistPosition\":0" +
                "}";

        consumer.onRegistrationWaitlisted(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).persist(captor.capture());

        Notification persisted = captor.getValue();
        assertEquals("You have been added to the waitlist.", persisted.body);
    }
}
