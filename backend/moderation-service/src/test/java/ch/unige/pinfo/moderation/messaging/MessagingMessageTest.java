package ch.unige.pinfo.moderation.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MessagingMessageTest {

    @Test
    void announcementPostedMessage_ignoresUnknownFields() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        UUID announcementId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();

        String json = String.format(
                "{\"announcementId\":\"%s\",\"eventId\":\"%s\",\"organizerId\":\"%s\"," +
                        "\"body\":\"Hello\",\"extra\":\"ignored\"}",
                announcementId, eventId, organizerId);

        AnnouncementPostedMessage message = mapper.readValue(json, AnnouncementPostedMessage.class);

        assertEquals(announcementId, message.announcementId);
        assertEquals(eventId, message.eventId);
        assertEquals(organizerId, message.organizerId);
        assertEquals("Hello", message.body);
    }

    @Test
    void eventCreatedMessage_ignoresUnknownFields() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();

        String json = String.format(
                "{\"eventId\":\"%s\",\"organizerId\":\"%s\"," +
                        "\"title\":\"T\",\"description\":\"D\",\"extra\":123}",
                eventId, organizerId);

        EventCreatedMessage message = mapper.readValue(json, EventCreatedMessage.class);

        assertEquals(eventId, message.eventId);
        assertEquals(organizerId, message.organizerId);
        assertEquals("T", message.title);
        assertEquals("D", message.description);
    }

    @Test
    void eventCancelledMessage_ignoresUnknownFields() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();

        String json = String.format(
                "{\"eventId\":\"%s\",\"organizerId\":\"%s\",\"extra\":false}",
                eventId, organizerId);

        EventCancelledMessage message = mapper.readValue(json, EventCancelledMessage.class);

        assertEquals(eventId, message.eventId);
        assertEquals(organizerId, message.organizerId);
    }
}
