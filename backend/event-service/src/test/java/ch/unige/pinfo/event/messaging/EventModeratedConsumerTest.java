package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.service.EventService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class EventModeratedConsumerTest {

    @Inject
    EventModeratedConsumer consumer;

    @InjectMock
    EventService eventService;

    @Test
    void onEventModerated_validMessage_appliesDecision() {
        UUID eventId = UUID.randomUUID();
        String rawMessage = String.format("{\"eventId\":\"%s\",\"status\":\"APPROVED\"}", eventId);

        consumer.onEventModerated(rawMessage);

        verify(eventService).applyModerationDecision(eventId, "APPROVED", null);
    }

    @Test
    void onEventModerated_deserializationFails_doesNotCallService() {
        consumer.onEventModerated("{invalid-json}");

        verifyNoInteractions(eventService);
    }
}