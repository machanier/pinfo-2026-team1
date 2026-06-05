package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.client.RegistrationServiceClient;
import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class EventMessagingConsumerTest {

    @Inject
    EventMessagingConsumer consumer;

    @InjectMock
    NotificationRepository notificationRepository;

    @InjectMock
    @Inject
    @RestClient
    RegistrationServiceClient registrationServiceClient;

    @BeforeEach
    void setUp() {
        reset(notificationRepository, registrationServiceClient);
    }

    @Test
    void onAnnouncementPosted_persistsNotificationPerStudent() {
        UUID eventId = UUID.randomUUID();
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();
        String body = "Welcome to the event";

        when(registrationServiceClient.getConfirmedStudentIds(eventId))
                .thenReturn(List.of(studentId1, studentId2));

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"body\":\"" + body + "\"" +
                "}";

        OffsetDateTime before = OffsetDateTime.now();
        consumer.onAnnouncementPosted(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).persist(captor.capture());

        List<Notification> persisted = captor.getAllValues();
        assertEquals(2, persisted.size());

        Notification first = persisted.get(0);
        assertEquals(NotificationType.ANNOUNCEMENT, first.type);
        assertEquals(eventId, first.eventId);
        assertEquals(body, first.body);
        assertFalse(first.read);
        assertNotNull(first.createdAt);
        assertFalse(first.createdAt.isBefore(before));

        // Verify both user UUIDs received a notification
        List<UUID> notifiedUserIds = persisted.stream().map(n -> n.userId).toList();
        assertTrue(notifiedUserIds.contains(studentId1));
        assertTrue(notifiedUserIds.contains(studentId2));
    }

    @Test
    void onAnnouncementPosted_missingEventId_skipsNotifications() {
        String message = "{\"body\":\"Hello\"}";

        consumer.onAnnouncementPosted(message);

        verify(notificationRepository, never()).persist(org.mockito.ArgumentMatchers.any(Notification.class));
        verify(registrationServiceClient, never()).getConfirmedStudentIds(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onAnnouncementPosted_missingBody_skipsNotifications() {
        UUID eventId = UUID.randomUUID();
        String message = "{\"eventId\":\"" + eventId + "\"}";

        consumer.onAnnouncementPosted(message);

        verify(notificationRepository, never()).persist(org.mockito.ArgumentMatchers.any(Notification.class));
        verify(registrationServiceClient, never()).getConfirmedStudentIds(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onEventCancelled_persistsNotificationPerStudent() {
        UUID eventId = UUID.randomUUID();
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        when(registrationServiceClient.getParticipantStudentIds(eventId))
                .thenReturn(List.of(studentId1, studentId2));

        String message = "{" +
                "\"event\":{" +
                "\"eventId\":\"" + eventId + "\"" +
                "}" +
                "}";

        OffsetDateTime before = OffsetDateTime.now();
        consumer.onEventCancelled(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).persist(captor.capture());

        List<Notification> persisted = captor.getAllValues();
        assertEquals(2, persisted.size());

        Notification first = persisted.get(0);
        assertEquals(NotificationType.EVENT_CANCELLED, first.type);
        assertEquals(eventId, first.eventId);
        assertEquals("L'événement a été annulé.", first.body);
        assertFalse(first.read);
        assertNotNull(first.createdAt);
        assertFalse(first.createdAt.isBefore(before));

        // Verify both user UUIDs received a notification
        List<UUID> notifiedUserIds = persisted.stream().map(n -> n.userId).toList();
        assertTrue(notifiedUserIds.contains(studentId1));
        assertTrue(notifiedUserIds.contains(studentId2));
    }

    @Test
    void onEventCancelled_missingEventEnvelope_skipsNotifications() {
        String message = "{\"title\":\"Cancelled\"}";

        consumer.onEventCancelled(message);

        verify(notificationRepository, never()).persist(org.mockito.ArgumentMatchers.any(Notification.class));
        verify(registrationServiceClient, never()).getParticipantStudentIds(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onEventCancelled_missingEventIdInEnvelope_skipsNotifications() {
        String message = "{" +
                "\"event\":{" +
                "\"title\":\"Cancelled\"" +
                "}" +
                "}";

        consumer.onEventCancelled(message);

        verify(notificationRepository, never()).persist(org.mockito.ArgumentMatchers.any(Notification.class));
        verify(registrationServiceClient, never()).getParticipantStudentIds(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onEventUpdated_persistsNotificationPerStudent() {
        UUID eventId = UUID.randomUUID();
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        when(registrationServiceClient.getParticipantStudentIds(eventId))
                .thenReturn(List.of(studentId1, studentId2));

        String message = "{" +
                "\"event\":{" +
                "\"eventId\":\"" + eventId + "\"" +
                "}" +
                "}";

        OffsetDateTime before = OffsetDateTime.now();
        consumer.onEventUpdated(message);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).persist(captor.capture());

        List<Notification> persisted = captor.getAllValues();
        assertEquals(2, persisted.size());

        Notification first = persisted.get(0);
        assertEquals(NotificationType.EVENT_UPDATED, first.type);
        assertEquals(eventId, first.eventId);
        assertEquals("Les informations de l'événement ont été mises à jour.", first.body);
        assertFalse(first.read);
        assertNotNull(first.createdAt);
        assertFalse(first.createdAt.isBefore(before));

        // Verify both user UUIDs received a notification
        List<UUID> notifiedUserIds = persisted.stream().map(n -> n.userId).toList();
        assertTrue(notifiedUserIds.contains(studentId1));
        assertTrue(notifiedUserIds.contains(studentId2));
    }

    @Test
    void onEventUpdated_missingEventEnvelope_skipsNotifications() {
        String message = "{\"title\":\"Changed\"}";

        consumer.onEventUpdated(message);

        verify(notificationRepository, never()).persist(org.mockito.ArgumentMatchers.any(Notification.class));
        verify(registrationServiceClient, never()).getParticipantStudentIds(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onEventUpdated_missingEventIdInEnvelope_skipsNotifications() {
        String message = "{" +
                "\"event\":{" +
                "\"title\":\"Changed\"" +
                "}" +
                "}";

        consumer.onEventUpdated(message);

        verify(notificationRepository, never()).persist(org.mockito.ArgumentMatchers.any(Notification.class));
        verify(registrationServiceClient, never()).getParticipantStudentIds(org.mockito.ArgumentMatchers.any());
    }
}