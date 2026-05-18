package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class EventCancelledConsumerTest {

    @Inject
    EventCancelledConsumer consumer;

    @InjectMock
    ModerationCaseRepository caseRepository;

    @Test
    void onEventCancelled_validMessage_deletesRelatedCases() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        String rawMessage = String.format(
                "{\"eventId\":\"%s\",\"organizerId\":\"%s\"}",
                eventId, organizerId);

        consumer.onEventCancelled(rawMessage);

        verify(caseRepository).delete("eventId", eventId);
    }

    @Test
    void onEventCancelled_deserializationFails_doesNotDelete() throws Exception {
        String rawMessage = "{bad-json}";
        consumer.onEventCancelled(rawMessage);

        verifyNoInteractions(caseRepository);
    }
}
