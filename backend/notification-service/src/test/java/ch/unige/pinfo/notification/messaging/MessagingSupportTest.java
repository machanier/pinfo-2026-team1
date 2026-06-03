package ch.unige.pinfo.notification.messaging;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MessagingSupportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parseUuidNode_returnsNullWhenNodeIsMissingOrNull() throws Exception {
        assertNull(MessagingSupport.parseUuid(objectMapper.readTree("{}").get("eventId")));
        assertNull(MessagingSupport.parseUuid(objectMapper.readTree("{\"eventId\":null}").get("eventId")));
    }

    @Test
    void parseUuidString_returnsUuidForValidInput() {
        UUID expected = UUID.randomUUID();

        UUID parsed = MessagingSupport.parseUuid(expected.toString());

        assertEquals(expected, parsed);
    }

    @Test
    void parseUuidString_returnsNameUuidForNonUuidInput() {
        String rawValue = "auth0|student-123";

        UUID parsed = MessagingSupport.parseUuid(rawValue);

        assertEquals(UUID.nameUUIDFromBytes(rawValue.getBytes(StandardCharsets.UTF_8)), parsed);
    }

    @Test
    void parseUuidString_returnsNullForBlankValue() {
        assertNull(MessagingSupport.parseUuid("   "));
    }

    @Test
    void buildNotification_setsAllExpectedFields() {
        UUID userId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        NotificationType type = NotificationType.ANNOUNCEMENT;
        String body = "Body message";

        OffsetDateTime before = OffsetDateTime.now();
        Notification notification = MessagingSupport.buildNotification(userId, eventId, type, body);
        OffsetDateTime after = OffsetDateTime.now();

        assertNotNull(notification.notificationId);
        assertEquals(userId, notification.userId);
        assertEquals(eventId, notification.eventId);
        assertEquals(type, notification.type);
        assertEquals(body, notification.body);
        assertFalse(notification.read);
        assertNotNull(notification.createdAt);
        assertTrue(!notification.createdAt.isBefore(before) && !notification.createdAt.isAfter(after));
    }
}
