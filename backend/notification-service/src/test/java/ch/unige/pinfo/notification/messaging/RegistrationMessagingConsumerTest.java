package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationMessagingConsumerTest {

    @Inject
    RegistrationMessagingConsumer consumer;

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
        assertEquals("Votre inscription a été confirmée.", persisted.body);
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

    @Test
    void onRegistrationCancelled_persistsCancellationAndWaitlistNotifications_whenSlotsAvailable() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID waitlisted1 = UUID.randomUUID();
        UUID waitlisted2 = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"," +
                "\"waitlistedStudentIds\":[\"" + waitlisted1 + "\",\"" + waitlisted2 + "\"]," +
                "\"availableSlots\":2" +
                "}";

        consumer.onRegistrationCancelled(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(3)).persist(captor.capture());

        List<Notification> persisted = captor.getAllValues();
        Notification cancelled = persisted.stream()
                .filter(notification -> NotificationType.REGISTRATION_CANCELLED.equals(notification.type))
                .findFirst()
                .orElseThrow();

        assertEquals(studentId, cancelled.userId);
        assertEquals(eventId, cancelled.eventId);
        assertEquals("Votre inscription a été annulée.", cancelled.body);
        assertFalse(cancelled.read);
        assertNotNull(cancelled.createdAt);

        long slotAvailableCount = persisted.stream()
                .filter(notification -> NotificationType.SLOT_AVAILABLE.equals(notification.type))
                .count();
        assertEquals(2, slotAvailableCount);
    }

    @Test
    void onRegistrationCancelled_noSlots_skipsWaitlistedNotifications() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID waitlisted1 = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"," +
                "\"waitlistedStudentIds\":[\"" + waitlisted1 + "\"]," +
                "\"availableSlots\":0" +
                "}";

        consumer.onRegistrationCancelled(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).persist(captor.capture());

        Notification persisted = captor.getValue();
        assertEquals(NotificationType.REGISTRATION_CANCELLED, persisted.type);
    }

    @Test
    void onRegistrationCancelled_missingStudentId_stillNotifiesWaitlisted() {
        UUID eventId = UUID.randomUUID();
        UUID waitlisted1 = UUID.randomUUID();
        UUID waitlisted2 = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"waitlistedStudentIds\":[\"" + waitlisted1 + "\",\"" + waitlisted2 + "\"]," +
                "\"availableSlots\":1" +
                "}";

        consumer.onRegistrationCancelled(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).persist(captor.capture());

        List<Notification> persisted = captor.getAllValues();
        long cancelledCount = persisted.stream()
                .filter(notification -> NotificationType.REGISTRATION_CANCELLED.equals(notification.type))
                .count();
        assertEquals(0, cancelledCount);
    }

    @Test
    void onRegistrationCancelled_missingWaitlistedStudentIds_skipsWaitlistedNotifications() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"studentId\":\"" + studentId + "\"," +
                "\"availableSlots\":1" +
                "}";

        consumer.onRegistrationCancelled(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).persist(captor.capture());

        Notification persisted = captor.getValue();
        assertEquals(NotificationType.REGISTRATION_CANCELLED, persisted.type);
    }

    @Test
    void onRegistrationCancelled_missingStudentIdAndNoSlots_skipsAll() {
        UUID eventId = UUID.randomUUID();

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"availableSlots\":0" +
                "}";

        consumer.onRegistrationCancelled(message);

        verify(notificationRepository, never()).persist(any(Notification.class));
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
        assertEquals("Position en liste d'attente : 3", persisted.body);
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
        assertEquals("Vous avez été ajouté·e à la liste d'attente.", persisted.body);
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
        assertEquals("Vous avez été ajouté·e à la liste d'attente.", persisted.body);
    }
}