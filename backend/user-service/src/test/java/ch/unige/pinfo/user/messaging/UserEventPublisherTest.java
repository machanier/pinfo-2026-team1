package ch.unige.pinfo.user.messaging;

import ch.unige.pinfo.user.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pure unit test (no Quarkus boot needed): the publisher's collaborators are
 * package-private fields, so we inject a mock Emitter and a real ObjectMapper
 * directly. Covers both publish methods plus their serialization-failure branch.
 */
class UserEventPublisherTest {

    UserEventPublisher publisher;
    @SuppressWarnings("unchecked")
    Emitter<String> emitter = mock(Emitter.class);

    @BeforeEach
    void setUp() {
        publisher = new UserEventPublisher();
        publisher.kafkaEmitter = emitter;
        publisher.objectMapper = new ObjectMapper();
    }

    @Test
    void publishOrganizerUpsert_sendsMappedJsonPayload() {
        User user = new User();
        UUID id = UUID.randomUUID();
        user.setId(id);
        user.setName("Club Escalade");
        user.setAvatarUrl("https://cdn.example/logo.png");

        publisher.publishOrganizerUpsert(user);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(emitter).send(captor.capture());
        String json = captor.getValue();
        assertTrue(json.contains("\"associationName\":\"Club Escalade\""), json);
        assertTrue(json.contains("\"logoUrl\":\"https://cdn.example/logo.png\""), json);
        assertTrue(json.contains("\"verified\":true"), json);
        assertTrue(json.contains(id.toString()), json);
    }

    @Test
    void publishOrganizerUpsertWithId_sendsMappedJsonPayload() {
        UUID id = UUID.randomUUID();

        publisher.publishOrganizerUpsertWithId(id, "Association Test");

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(emitter).send(captor.capture());
        String json = captor.getValue();
        assertTrue(json.contains("\"associationName\":\"Association Test\""), json);
        assertTrue(json.contains(id.toString()), json);
        assertTrue(json.contains("\"verified\":true"), json);
    }

    @Test
    void publishOrganizerUpsert_serializationError_isCaughtAndNothingSent() throws Exception {
        ObjectMapper throwing = mock(ObjectMapper.class);
        when(throwing.writeValueAsString(any())).thenThrow(new RuntimeException("boom"));
        publisher.objectMapper = throwing;

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("X");

        assertDoesNotThrow(() -> publisher.publishOrganizerUpsert(user));
        verify(emitter, never()).send(anyString());
    }

    @Test
    void publishOrganizerUpsertWithId_serializationError_isCaughtAndNothingSent() throws Exception {
        ObjectMapper throwing = mock(ObjectMapper.class);
        when(throwing.writeValueAsString(any())).thenThrow(new RuntimeException("boom"));
        publisher.objectMapper = throwing;

        assertDoesNotThrow(() -> publisher.publishOrganizerUpsertWithId(UUID.randomUUID(), "Y"));
        verify(emitter, never()).send(anyString());
    }
}
