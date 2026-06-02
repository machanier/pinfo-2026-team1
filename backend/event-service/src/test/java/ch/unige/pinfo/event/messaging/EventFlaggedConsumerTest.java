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
class EventFlaggedConsumerTest {

    @Inject
    EventFlaggedConsumer consumer;

    @InjectMock
    EventService eventService;

    @Test
    void onEventFlagged_validMessage_marksPendingModeration() {
        UUID eventId = UUID.randomUUID();
        String rawMessage = String.format("{\"eventId\":\"%s\"}", eventId);

        consumer.onEventFlagged(rawMessage);

        verify(eventService).markPendingModeration(eventId);
    }

    @Test
    void onEventFlagged_deserializationFails_doesNotCallService() {
        consumer.onEventFlagged("{invalid-json}");

        verifyNoInteractions(eventService);
    }
}