package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.service.ModerationService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class EventCreatedConsumerTest {

    @Inject
    EventCreatedConsumer consumer;

    @InjectMock
    ModerationService moderationService;

    @Test
    void onEventCreated_validMessage_callsModerationService() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        String rawMessage = String.format(
                "{\"eventId\":\"%s\",\"organizerId\":\"%s\",\"title\":\"Title\",\"description\":\"Desc\"}",
                eventId, organizerId);

        consumer.onEventCreated(rawMessage);

        verify(moderationService).screenEvent(org.mockito.ArgumentMatchers.argThat(
                message -> eventId.equals(message.eventId)
                        && organizerId.equals(message.organizerId)
                        && "Title".equals(message.title)
                        && "Desc".equals(message.description)));
    }

    @Test
    void onEventCreated_deserializationFails_doesNotCallService() throws Exception {
        String rawMessage = "{bad-json}";
        consumer.onEventCreated(rawMessage);

        verifyNoInteractions(moderationService);
    }
}
