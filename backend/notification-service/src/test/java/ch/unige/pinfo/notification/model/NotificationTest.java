package ch.unige.pinfo.notification.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.time.OffsetDateTime;
import java.util.UUID;

class NotificationTest {

    @Test
    void testNotificationGettersAndSetters() {
        Notification notification = new Notification();
        UUID notificationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        notification.notificationId = notificationId;
        notification.userId = userId;
        notification.type = NotificationType.ANNOUNCEMENT;
        notification.eventId = eventId;
        notification.body = "Test Body";
        notification.read = false;
        notification.createdAt = now;

        assertEquals(notificationId, notification.notificationId);
        assertEquals(userId, notification.userId);
        assertEquals(NotificationType.ANNOUNCEMENT, notification.type);
        assertEquals(eventId, notification.eventId);
        assertEquals("Test Body", notification.body);
        assertFalse(notification.read);
        assertEquals(now, notification.createdAt);
    }
}
