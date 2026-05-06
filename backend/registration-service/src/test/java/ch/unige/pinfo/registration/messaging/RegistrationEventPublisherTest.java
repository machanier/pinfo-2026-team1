package ch.unige.pinfo.registration.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import jakarta.inject.Inject;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@QuarkusTest
class RegistrationEventPublisherTest {

    @Inject
    RegistrationEventPublisher publisher;

    @InjectMock
    @org.eclipse.microprofile.reactive.messaging.Channel("registration-confirmed")
    Emitter<String> confirmedEmitter;

    @InjectMock
    @org.eclipse.microprofile.reactive.messaging.Channel("registration-waitlisted")
    Emitter<String> waitlistedEmitter;

    @InjectMock
    @org.eclipse.microprofile.reactive.messaging.Channel("registration-cancelled")
    Emitter<String> cancelledEmitter;

    // On mock l'ObjectMapper pour forcer les exceptions et couvrir les blocs catch
    @InjectMock
    ObjectMapper objectMapper;

    @Test
    @DisplayName("Should publish confirmed event successfully")
    void testPublishConfirmedSuccess() throws JsonProcessingException {
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        publisher.publishConfirmed(regId, eventId, "student-123");

        verify(confirmedEmitter).send(anyString());
    }

    @Test
    @DisplayName("Should publish waitlisted event successfully")
    void testPublishWaitlistedSuccess() throws JsonProcessingException {
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        publisher.publishWaitlisted(regId, eventId, "student-123", 1);

        verify(waitlistedEmitter).send(anyString());
    }

    @Test
    @DisplayName("Should publish cancelled event successfully")
    void testPublishCancelledSuccess() throws JsonProcessingException {
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        publisher.publishCancelled(regId, eventId, List.of("s1"), 5);

        verify(cancelledEmitter).send(anyString());
    }

    @Test
    @DisplayName("Should cover catch blocks when serialization fails")
    void testPublishErrorPaths() throws JsonProcessingException {
        // Configuration du mock pour lever une exception sur n'importe quel appel
        when(objectMapper.writeValueAsString(any())).thenThrow(new RuntimeException("Jackson error"));

        // On appelle les 3 méthodes pour couvrir les 3 blocs catch
        publisher.publishConfirmed(UUID.randomUUID(), UUID.randomUUID(), "s");
        publisher.publishWaitlisted(UUID.randomUUID(), UUID.randomUUID(), "s", 1);
        publisher.publishCancelled(UUID.randomUUID(), UUID.randomUUID(), List.of(), 0);

        // On vérifie qu'aucun message n'a été envoyé à cause de l'erreur
        verify(confirmedEmitter, never()).send(anyString());
        verify(waitlistedEmitter, never()).send(anyString());
        verify(cancelledEmitter, never()).send(anyString());
    }
}