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

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationCancelledConsumerTest {

    @Inject
    RegistrationCancelledConsumer consumer;

    @InjectMock
    NotificationRepository notificationRepository;

    @BeforeEach
    void setUp() {
        reset(notificationRepository);
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
        assertEquals("Your registration has been cancelled.", cancelled.body);
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
}
