package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;

// Helper used by kafka consumer classes  to parse UUIDs and construct a notification
final class MessagingSupport {

    private MessagingSupport() {
    }

    static UUID parseUuid(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return parseUuid(node.asText());
    }

    static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(value.getBytes(StandardCharsets.UTF_8));
        }
    }

    static Notification buildNotification(UUID userId, UUID eventId, NotificationType type, String body) {
        Notification notification = new Notification();
        notification.notificationId = UUID.randomUUID();
        notification.userId = userId;
        notification.type = type;
        notification.eventId = eventId;
        notification.body = body;
        notification.read = false;
        notification.createdAt = OffsetDateTime.now();
        return notification;
    }
}
