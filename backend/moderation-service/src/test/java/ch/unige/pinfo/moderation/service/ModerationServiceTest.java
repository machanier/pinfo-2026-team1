package ch.unige.pinfo.moderation.service;

import ch.unige.pinfo.moderation.ai.OpenAiModerationClient;
import ch.unige.pinfo.moderation.ai.OpenAiModerationRequest;
import ch.unige.pinfo.moderation.ai.OpenAiModerationResponse;
import ch.unige.pinfo.moderation.messaging.ModerationPublisher;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class ModerationServiceTest {

    @Inject
    ModerationService moderationService;

    @Inject
    ModerationCaseRepository caseRepository;

    @InjectMock
    @Inject
    @RestClient
    OpenAiModerationClient moderationClient;

    @InjectMock
    @Inject
    ModerationPublisher moderationPublisher;

    @BeforeEach
    @Transactional
    void setUp() {
        caseRepository.deleteAll();
    }

    @Test
    void screenEvent_unflagged_persistsAutoApprovedAndPublishesDecision() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        String title = "Tech Expo";
        String description = "A conference for developers";
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(response(false));

        moderationService.screenEvent(eventId, organizerId, title, description);

        ModerationCase saved = getOnlyCase();
        assertEquals(eventId, saved.eventId);
        assertEquals(organizerId, saved.organizerId);
        assertEquals(title, saved.title);
        assertEquals(ModerationStatus.AUTO_APPROVED, saved.status);
        assertTrue(saved.flags.isEmpty());
        assertNotNull(saved.createdAt);

        verify(moderationPublisher).sendEventDecision(eventId, "APPROVED");
        verify(moderationPublisher, never()).sendAnnouncementDecision(any(), any());
        verify(moderationPublisher, never()).sendFlagged(any());

        ArgumentCaptor<OpenAiModerationRequest> requestCaptor = ArgumentCaptor.forClass(OpenAiModerationRequest.class);
        verify(moderationClient).moderate(requestCaptor.capture());
        List<String> input = requestCaptor.getValue().input;
        assertEquals(1, input.size());
        assertEquals("Title: " + title + "\nDescription: " + description, input.get(0));
    }

    @Test
    void screenEvent_unflagged_publishFails_persistsPending() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(response(false));
        doThrow(new IllegalStateException("publish failed"))
                .when(moderationPublisher).sendEventDecision(eq(eventId), eq("APPROVED"));

        moderationService.screenEvent(eventId, organizerId, "Event", "Body");

        ModerationCase saved = getOnlyCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertTrue(saved.flags.isEmpty());
        verify(moderationPublisher, never()).sendFlagged(any());
    }

    @Test
    void screenEvent_flagged_persistsPendingWithFlagsAndPublishesFlaggedEvent() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(flaggedResponse());

        moderationService.screenEvent(eventId, organizerId, "Flagged event", "Bad content");

        ModerationCase saved = getOnlyCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(4, saved.flags.size());
        assertContainsReason(saved.flags, "Hate speech detected");
        assertContainsReason(saved.flags, "Violence detected");
        assertContainsReason(saved.flags, "Self-harm content detected");
        assertContainsReason(saved.flags, "Inappropriate content detected");

        verify(moderationPublisher).sendFlagged(eventId);
        verify(moderationPublisher, never()).sendEventDecision(any(), any());
        verify(moderationPublisher, never()).sendAnnouncementDecision(any(), any());
    }

    @Test
    void screenEvent_flagged_whenFlaggedPublishFails_stillPersistsPendingCase() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(flaggedResponse());
        doThrow(new IllegalStateException("flagged publish failed"))
                .when(moderationPublisher).sendFlagged(eventId);

        moderationService.screenEvent(eventId, organizerId, "Flagged event", "Bad content");

        ModerationCase saved = getOnlyCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(4, saved.flags.size());
        verify(moderationPublisher).sendFlagged(eventId);
        verify(moderationPublisher, never()).sendEventDecision(any(), any());
        verify(moderationPublisher, never()).sendAnnouncementDecision(any(), any());
    }

    @Test
    void screenAnnouncement_unflagged_persistsAutoApprovedAndPublishesAnnouncementDecision() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        UUID announcementId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(response(false));

        moderationService.screenAnnouncement(eventId, organizerId, "Announcement body", announcementId);

        ModerationCase saved = getOnlyCase();
        assertEquals(eventId, saved.eventId);
        assertEquals(announcementId, saved.announcementId);
        assertEquals("Announcement", saved.title);
        assertEquals(ModerationStatus.AUTO_APPROVED, saved.status);

        verify(moderationPublisher).sendAnnouncementDecision(announcementId, "APPROVED");
        verify(moderationPublisher, never()).sendEventDecision(any(), any());
        verify(moderationPublisher, never()).sendFlagged(any());
    }

    @Test
    void screenAnnouncement_flagged_persistsPendingAndDoesNotPublishFlaggedEvent() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        UUID announcementId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(flaggedResponse());

        moderationService.screenAnnouncement(eventId, organizerId, "Bad announcement", announcementId);

        ModerationCase saved = getOnlyCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(announcementId, saved.announcementId);
        assertTrue(saved.flags.size() > 0);
        verify(moderationPublisher, never()).sendFlagged(any());
        verify(moderationPublisher, never()).sendAnnouncementDecision(any(), any());
    }

    @Test
    void screenEvent_whenModerationApiThrows_createsFallbackCase() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class)))
                .thenThrow(new IllegalStateException("openai unavailable"));

        moderationService.screenEvent(eventId, organizerId, "Fallback title", "Body");

        ModerationCase saved = getOnlyCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(1, saved.flags.size());
        ModerationFlag flag = saved.flags.get(0);
        assertEquals("system", flag.field);
        assertEquals("Automated screening unavailable", flag.reason);
        assertEquals(0.0f, flag.confidence);

        verify(moderationPublisher, never()).sendEventDecision(any(), any());
        verify(moderationPublisher, never()).sendAnnouncementDecision(any(), any());
        verify(moderationPublisher, never()).sendFlagged(any());
    }

    @Test
    void createFallbackCase_persistsPendingSystemFlag() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        UUID announcementId = UUID.randomUUID();

        moderationService.createFallbackCase(eventId, organizerId, "Fallback", announcementId);

        ModerationCase saved = getOnlyCase();
        assertEquals(eventId, saved.eventId);
        assertEquals(organizerId, saved.organizerId);
        assertEquals(announcementId, saved.announcementId);
        assertEquals("Fallback", saved.title);
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(1, saved.flags.size());
        assertEquals("system", saved.flags.get(0).field);
        assertEquals("Automated screening unavailable", saved.flags.get(0).reason);
        assertNotNull(saved.createdAt);
    }

    @Test
    void reScreenEventIfChanged_noPriorCase_screensNormally() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(response(false));

        moderationService.reScreenEventIfChanged(eventId, organizerId, "Title", "Body");

        assertEquals(1, countCases());
        verify(moderationClient, times(1)).moderate(any(OpenAiModerationRequest.class));
    }

    @Test
    void reScreenEventIfChanged_contentUnchanged_skipsWithoutCallingOpenAi() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(response(false));
        moderationService.screenEvent(eventId, organizerId, "Title", "Body"); // initial screening

        moderationService.reScreenEventIfChanged(eventId, organizerId, "Title", "Body"); // identical content

        assertEquals(1, countCases()); // no duplicate case is created
        verify(moderationClient, times(1)).moderate(any(OpenAiModerationRequest.class)); // OpenAI not called again
    }

    @Test
    void reScreenEventIfChanged_contentChanged_screensAgain() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        when(moderationClient.moderate(any(OpenAiModerationRequest.class))).thenReturn(response(false));
        moderationService.screenEvent(eventId, organizerId, "Title", "Body");

        moderationService.reScreenEventIfChanged(eventId, organizerId, "Title", "Edited body");

        assertEquals(2, countCases()); // a genuine edit triggers a fresh screening
        verify(moderationClient, times(2)).moderate(any(OpenAiModerationRequest.class));
    }

    @Transactional
    long countCases() {
        return caseRepository.count();
    }

    private void assertContainsReason(List<ModerationFlag> flags, String expectedReason) {
        assertTrue(flags.stream().anyMatch(flag -> expectedReason.equals(flag.reason)));
    }

    @Transactional
    ModerationCase getOnlyCase() {
        assertEquals(1, caseRepository.count());
        return caseRepository.listAll().get(0);
    }

    private OpenAiModerationResponse response(boolean flagged) {
        OpenAiModerationResponse response = new OpenAiModerationResponse();
        OpenAiModerationResponse.ModerationResult result = new OpenAiModerationResponse.ModerationResult();
        result.flagged = flagged;
        result.categories = new OpenAiModerationResponse.Categories();
        result.categoryScores = new OpenAiModerationResponse.CategoryScores();
        response.results = List.of(result);
        return response;
    }

    private OpenAiModerationResponse flaggedResponse() {
        OpenAiModerationResponse response = response(true);
        OpenAiModerationResponse.ModerationResult result = response.results.get(0);
        result.categories.hate = true;
        result.categories.harassment = false;
        result.categories.violence = true;
        result.categories.selfHarm = true;
        result.categories.sexualMinors = true;
        result.categoryScores.hate = 0.95f;
        result.categoryScores.harassment = 0.11f;
        result.categoryScores.violence = 0.87f;
        result.categoryScores.selfHarm = 0.72f;
        result.categoryScores.sexualMinors = 0.98f;
        return response;
    }
}