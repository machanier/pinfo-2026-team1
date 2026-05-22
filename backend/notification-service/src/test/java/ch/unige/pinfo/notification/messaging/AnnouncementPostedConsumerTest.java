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
class AnnouncementPostedConsumerTest {

    @Inject
    AnnouncementPostedConsumer consumer;

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
    void onAnnouncementPosted_persistsNotificationPerStudent() {
        UUID eventId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        String externalStudentId = "auth0|student";
        String body = "Welcome to the event";

        when(registrationServiceClient.getConfirmedStudentIds(eventId))
                .thenReturn(List.of(studentId.toString(), externalStudentId));

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

        UUID expectedExternalId = UUID.nameUUIDFromBytes(externalStudentId.getBytes(StandardCharsets.UTF_8));
        long matches = persisted.stream()
                .filter(notification -> expectedExternalId.equals(notification.userId))
                .count();
        assertEquals(1, matches);
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
}
