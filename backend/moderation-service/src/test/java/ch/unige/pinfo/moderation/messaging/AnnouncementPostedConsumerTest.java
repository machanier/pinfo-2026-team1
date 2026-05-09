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
class AnnouncementPostedConsumerTest {

    @Inject
    AnnouncementPostedConsumer consumer;

    @InjectMock
    ModerationService moderationService;

    @Test
    void onAnnouncementPosted_validMessage_callsModerationService() throws Exception {
        UUID announcementId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        String rawMessage = String.format(
                "{\"announcementId\":\"%s\",\"eventId\":\"%s\",\"organizerId\":\"%s\",\"body\":\"Hello\"}",
                announcementId, eventId, organizerId);

        consumer.onAnnouncementPosted(rawMessage);

        verify(moderationService).screenAnnouncement(org.mockito.ArgumentMatchers.argThat(
                message -> announcementId.equals(message.announcementId)
                        && eventId.equals(message.eventId)
                        && organizerId.equals(message.organizerId)
                        && "Hello".equals(message.body)));
    }

    @Test
    void onAnnouncementPosted_deserializationFails_doesNotCallService() throws Exception {
        String rawMessage = "{invalid-json}";
        consumer.onAnnouncementPosted(rawMessage);

        verifyNoInteractions(moderationService);
    }
}
