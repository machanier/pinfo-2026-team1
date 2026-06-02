package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import ch.unige.pinfo.moderation.service.ModerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ModerationConsumerTest {

    @Mock
    ModerationService moderationService;

    @Mock
    ModerationCaseRepository caseRepository;

    private ModerationConsumer consumer;

    @BeforeEach
    void setUp() {
        consumer = new ModerationConsumer();
        consumer.moderationService = moderationService;
        consumer.caseRepository = caseRepository;
        consumer.objectMapper = new ObjectMapper();
    }

    @Test
    void onEventSubmitted_delegatesToModerationService() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        String title = "Conference 2026";
        String description = "Annual tech event";

        consumer.onEventSubmitted(eventMessage(eventId, organizerId, title, description));

        verify(moderationService).screenEvent(eventId, organizerId, title, description);
        verifyNoInteractions(caseRepository);
    }

    @Test
    void onEventUpdated_delegatesToModerationService() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        String title = "Updated title";
        String description = "Updated description";

        consumer.onEventUpdated(eventMessage(eventId, organizerId, title, description));

        verify(moderationService).screenEvent(eventId, organizerId, title, description);
        verifyNoInteractions(caseRepository);
    }

    @Test
    void onEventCancelled_deletesModerationCasesByEventId() {
        UUID eventId = UUID.randomUUID();

        consumer.onEventCancelled(cancelledMessage(eventId, UUID.randomUUID()));

        verify(caseRepository).delete("eventId", eventId);
        verifyNoInteractions(moderationService);
    }

    @Test
    void onAnnouncementPosted_delegatesToAnnouncementScreening() {
        UUID announcementId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        String body = "Important announcement";

        consumer.onAnnouncementPosted(announcementMessage(announcementId, eventId, organizerId, body));

        verify(moderationService).screenAnnouncement(eventId, organizerId, body, announcementId);
        verifyNoInteractions(caseRepository);
    }

    @Test
    void malformedJson_isIgnored() {
        assertDoesNotThrow(() -> consumer.onEventSubmitted("{bad json"));

        verifyNoInteractions(moderationService);
        verifyNoInteractions(caseRepository);
    }

    private String eventMessage(UUID eventId, UUID organizerId, String title, String description) {
        return "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"organizerId\":\"" + organizerId + "\"," +
                "\"title\":\"" + title + "\"," +
                "\"description\":\"" + description + "\"}";
    }

    private String cancelledMessage(UUID eventId, UUID organizerId) {
        return "{" +
                "\"eventId\":\"" + eventId + "\"," +
                "\"organizerId\":\"" + organizerId + "\"}";
    }

    private String announcementMessage(UUID announcementId, UUID eventId, UUID organizerId, String body) {
        return "{" +
                "\"announcementId\":\"" + announcementId + "\"," +
                "\"eventId\":\"" + eventId + "\"," +
                "\"organizerId\":\"" + organizerId + "\"," +
                "\"body\":\"" + body + "\"}";
    }
}