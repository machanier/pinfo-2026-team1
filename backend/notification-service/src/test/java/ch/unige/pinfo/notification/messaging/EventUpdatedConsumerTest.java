package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.client.RegistrationServiceClient;
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
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class EventUpdatedConsumerTest {

    @Inject
    EventUpdatedConsumer consumer;

    @InjectMock
    NotificationRepository notificationRepository;

    @InjectMock
    @RestClient
    RegistrationServiceClient registrationServiceClient;

    @BeforeEach
    void setUp() {
        reset(notificationRepository, registrationServiceClient);
    }

    @Test
    void onEventUpdated_persistsNotificationPerStudent() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        String externalStudentId = "auth0|student";

        when(registrationServiceClient.getParticipantStudentIds(eventId))
                .thenReturn(List.of(studentId.toString(), externalStudentId));

        String message = "{" +
                "\"eventId\":\"" + eventId + "\"" +
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
        assertEquals("Event details have been updated.", first.body);
        assertFalse(first.read);
        assertNotNull(first.createdAt);
        assertFalse(first.createdAt.isBefore(before));

        UUID expectedExternalId = UUID.nameUUIDFromBytes(externalStudentId.getBytes(StandardCharsets.UTF_8));
        long matches = persisted.stream()
                .filter(notification -> expectedExternalId.equals(notification.userId))
                .count();
        assertEquals(1, matches);
    }

    @Test
    void onEventUpdated_missingEventId_skipsNotifications() {
        String message = "{\"title\":\"Changed\"}";

        consumer.onEventUpdated(message);

        verify(notificationRepository, never()).persist(org.mockito.ArgumentMatchers.any(Notification.class));
        verify(registrationServiceClient, never()).getParticipantStudentIds(org.mockito.ArgumentMatchers.any());
    }
}
