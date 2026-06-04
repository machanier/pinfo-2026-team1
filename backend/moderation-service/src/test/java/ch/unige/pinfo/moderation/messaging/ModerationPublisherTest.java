package ch.unige.pinfo.moderation.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ModerationPublisherTest {

    @Mock
    Emitter<String> eventModeratedEmitter;

    @Mock
    Emitter<String> announcementModeratedEmitter;

    @Mock
    Emitter<String> flaggedEmitter;

    private ModerationPublisher publisher;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        publisher = new ModerationPublisher();
        publisher.eventModeratedEmitter = eventModeratedEmitter;
        publisher.announcementModeratedEmitter = announcementModeratedEmitter;
        publisher.flaggedEmitter = flaggedEmitter;

        objectMapper = new ObjectMapper();
        publisher.objectMapper = objectMapper;
    }

    @Test
    void sendEventDecision_emitsEventPayload() throws Exception {
        UUID eventId = UUID.randomUUID();

        publisher.sendEventDecision(eventId, "APPROVED");

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(eventModeratedEmitter).send(payloadCaptor.capture());

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals(eventId.toString(), payload.get("eventId").asText());
        assertEquals("APPROVED", payload.get("status").asText());
    }

    @Test
    void sendEventDecision_withReason_includesReasonInPayload() throws Exception {
        UUID eventId = UUID.randomUUID();

        publisher.sendEventDecision(eventId, "REJECTED", "Contenu violent");

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(eventModeratedEmitter).send(payloadCaptor.capture());

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals(eventId.toString(), payload.get("eventId").asText());
        assertEquals("REJECTED", payload.get("status").asText());
        assertTrue(payload.has("reason"));
        assertEquals("Contenu violent", payload.get("reason").asText());
    }

    @Test
    void sendEventDecision_blankReason_omitsReasonFromPayload() throws Exception {
        UUID eventId = UUID.randomUUID();

        publisher.sendEventDecision(eventId, "APPROVED", "   ");

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(eventModeratedEmitter).send(payloadCaptor.capture());

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertFalse(payload.has("reason"));
    }

    @Test
    void sendAnnouncementDecision_emitsAnnouncementPayload() throws Exception {
        UUID announcementId = UUID.randomUUID();

        publisher.sendAnnouncementDecision(announcementId, "REJECTED");

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(announcementModeratedEmitter).send(payloadCaptor.capture());

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals(announcementId.toString(), payload.get("announcementId").asText());
        assertEquals("REJECTED", payload.get("status").asText());
    }

    @Test
    void sendFlagged_emitsFlaggedPayload() throws Exception {
        UUID eventId = UUID.randomUUID();

        publisher.sendFlagged(eventId);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(flaggedEmitter).send(payloadCaptor.capture());

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals(eventId.toString(), payload.get("eventId").asText());
    }

    @Test
    void sendEventDecision_wrapsSerializationFailures() {
        publisher.objectMapper = new ObjectMapper() {
            @Override
            public String writeValueAsString(Object value) throws com.fasterxml.jackson.core.JsonProcessingException {
                throw new com.fasterxml.jackson.core.JsonProcessingException("boom") {
                };
            }
        };

        assertThrows(IllegalStateException.class,
                () -> publisher.sendEventDecision(UUID.randomUUID(), "APPROVED"));
    }
}