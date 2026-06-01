package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.service.AnnouncementService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class AnnouncementModeratedConsumerTest {

    @Inject
    AnnouncementModeratedConsumer consumer;

    @InjectMock
    AnnouncementService announcementService;

    @Test
    void onAnnouncementModerated_validMessage_appliesDecision() {
        UUID announcementId = UUID.randomUUID();
        String rawMessage = String.format(
                "{\"announcementId\":\"%s\",\"status\":\"APPROVED\"}",
                announcementId);

        consumer.onAnnouncementModerated(rawMessage);

        verify(announcementService).applyModerationDecision(announcementId, "APPROVED");
    }

    @Test
    void onAnnouncementModerated_deserializationFails_doesNotCallService() {
        consumer.onAnnouncementModerated("{invalid-json}");

        verifyNoInteractions(announcementService);
    }
}
