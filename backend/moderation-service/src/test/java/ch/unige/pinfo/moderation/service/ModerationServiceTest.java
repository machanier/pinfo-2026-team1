package ch.unige.pinfo.moderation.service;

import ch.unige.pinfo.moderation.ai.OpenAiModerationClient;
import ch.unige.pinfo.moderation.ai.OpenAiModerationRequest;
import ch.unige.pinfo.moderation.ai.OpenAiModerationResponse;
import ch.unige.pinfo.moderation.event.EventServiceClient;
import ch.unige.pinfo.moderation.messaging.AnnouncementPostedMessage;
import ch.unige.pinfo.moderation.messaging.EventCreatedMessage;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
class ModerationServiceTest {

    @InjectMock
    @RestClient
    OpenAiModerationClient moderationClient;

    @InjectMock
    @RestClient
    EventServiceClient eventServiceClient;

    @Inject
    ModerationCaseRepository caseRepository;

    @Inject
    ModerationService moderationService;

    private UUID eventId;
    private UUID organizerId;

    @BeforeEach
    @Transactional
    void setUp() {
        eventId = UUID.randomUUID();
        organizerId = UUID.randomUUID();
        caseRepository.deleteAll();
        when(eventServiceClient.publishEvent(any(), any())).thenReturn(Response.ok().build());
    }

    // --- screenEvent ---

    @Test
    void screenEvent_notFlagged_persistsAutoApprovedCaseWithNoFlags() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "Clean Title", "Clean description");
        when(moderationClient.moderate(any())).thenReturn(buildResponse(false));
        when(eventServiceClient.publishEvent(any(), any())).thenReturn(Response.ok().build());

        moderationService.screenEvent(event);

        ModerationCase saved = capturePersistedCase();
        assertEquals(eventId, saved.eventId);
        assertEquals(organizerId, saved.organizerId);
        assertEquals("Clean Title", saved.title);
        assertEquals(ModerationStatus.AUTO_APPROVED, saved.status);
        assertTrue(saved.flags.isEmpty());
        assertNotNull(saved.createdAt);
    }

    @Test
    void screenEvent_flagged_persistsPendingCaseWithFlags() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "Bad Title", "Harmful content");
        when(moderationClient.moderate(any())).thenReturn(buildFlaggedResponse(true, false, false, false, false));

        moderationService.screenEvent(event);

        ModerationCase saved = capturePersistedCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(1, saved.flags.size());
        assertEquals("content", saved.flags.get(0).field);
        assertEquals("Hate speech detected", saved.flags.get(0).reason);
    }

    @Test
    void screenEvent_allCategoriesFlagged_persistsAllFlags() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "Title", "Body");
        when(moderationClient.moderate(any())).thenReturn(buildFlaggedResponse(true, true, true, true, true));

        moderationService.screenEvent(event);

        ModerationCase saved = capturePersistedCase();
        assertEquals(5, saved.flags.size());
    }

    @Test
    void screenEvent_moderationApiFails_persistsFallbackPendingCase() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "Title", "Body");
        when(moderationClient.moderate(any())).thenThrow(new RuntimeException("API unavailable"));

        moderationService.screenEvent(event);

        ModerationCase saved = capturePersistedCase();
        assertEquals(eventId, saved.eventId);
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(1, saved.flags.size());
        assertEquals("Automated screening unavailable", saved.flags.get(0).reason);
    }

    @Test
    void screenEvent_sendsCorrectTextToModerationApi() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "My Title", "My Description");
        when(moderationClient.moderate(any())).thenReturn(buildResponse(false));

        moderationService.screenEvent(event);

        ArgumentCaptor<OpenAiModerationRequest> requestCaptor = ArgumentCaptor.forClass(OpenAiModerationRequest.class);
        verify(moderationClient).moderate(requestCaptor.capture());
        assertEquals(List.of("Title: My Title\nDescription: My Description"), requestCaptor.getValue().input);
    }

    // --- screenAnnouncement ---

    @Test
    void screenAnnouncement_notFlagged_persistsAutoApprovedCaseWithAnnouncementTitle() {
        AnnouncementPostedMessage announcement = buildAnnouncement(eventId, organizerId, "Clean announcement body");
        when(moderationClient.moderate(any())).thenReturn(buildResponse(false));

        moderationService.screenAnnouncement(announcement);

        ModerationCase saved = capturePersistedCase();
        assertEquals(eventId, saved.eventId);
        assertEquals(organizerId, saved.organizerId);
        assertEquals("Announcement", saved.title);
        assertEquals(ModerationStatus.AUTO_APPROVED, saved.status);
        assertTrue(saved.flags.isEmpty());
        verify(eventServiceClient, never()).publishEvent(any(), any());
    }

    @Test
    void screenAnnouncement_flagged_persistsPendingCase() {
        AnnouncementPostedMessage announcement = buildAnnouncement(eventId, organizerId, "Harmful body");
        when(moderationClient.moderate(any())).thenReturn(buildFlaggedResponse(false, true, false, false, false));

        moderationService.screenAnnouncement(announcement);

        ModerationCase saved = capturePersistedCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals(1, saved.flags.size());
        assertEquals("Harassment detected", saved.flags.get(0).reason);
    }

    @Test
    void screenAnnouncement_moderationApiFails_persistsFallbackPendingCase() {
        AnnouncementPostedMessage announcement = buildAnnouncement(eventId, organizerId, "Body");
        when(moderationClient.moderate(any())).thenThrow(new RuntimeException("API unavailable"));

        moderationService.screenAnnouncement(announcement);

        ModerationCase saved = capturePersistedCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertEquals("Automated screening unavailable", saved.flags.get(0).reason);
    }

    // --- createFallbackCase ---

    @Test
    void createFallbackCase_persistsCaseWithSystemFlag() {
        moderationService.createFallbackCase(eventId, organizerId, "Some Title");

        ModerationCase saved = capturePersistedCase();
        assertEquals(eventId, saved.eventId);
        assertEquals(organizerId, saved.organizerId);
        assertEquals("Some Title", saved.title);
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertNotNull(saved.createdAt);
        assertEquals(1, saved.flags.size());

        ModerationFlag flag = saved.flags.get(0);
        assertEquals("system", flag.field);
        assertEquals("Automated screening unavailable", flag.reason);
        assertEquals(0.0f, flag.confidence);
    }

    // --- Edge cases ---

    @Test
    void screenEvent_nullDescription_doesNotThrow() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "Title", null);
        when(moderationClient.moderate(any())).thenReturn(buildResponse(false));
        when(eventServiceClient.publishEvent(any(), any())).thenReturn(Response.ok().build());

        moderationService.screenEvent(event);

        ArgumentCaptor<OpenAiModerationRequest> requestCaptor = ArgumentCaptor.forClass(OpenAiModerationRequest.class);
        verify(moderationClient).moderate(requestCaptor.capture());
        assertEquals(List.of("Title: Title\nDescription: "), requestCaptor.getValue().input);
    }

    @Test
    void screenEvent_flaggedWithSexualMinors_usesActualScore() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "Title", "Body");
        when(moderationClient.moderate(any())).thenReturn(buildFlaggedResponse(false, false, false, false, true));

        moderationService.screenEvent(event);

        ModerationCase saved = capturePersistedCase();
        ModerationFlag flag = saved.flags.get(0);
        assertEquals("Inappropriate content detected", flag.reason);
        assertEquals(0.95f, flag.confidence); // actual score from buildFlaggedResponse, not hardcoded 1.0f
    }

    @Test
    void screenEvent_notFlagged_publishFails_keepsPendingCase() {
        EventCreatedMessage event = buildEvent(eventId, organizerId, "Clean Title", "Clean description");
        when(moderationClient.moderate(any())).thenReturn(buildResponse(false));
        when(eventServiceClient.publishEvent(any(), any()))
                .thenReturn(Response.status(Response.Status.SERVICE_UNAVAILABLE).build());

        moderationService.screenEvent(event);

        ModerationCase saved = capturePersistedCase();
        assertEquals(ModerationStatus.PENDING, saved.status);
        assertTrue(saved.flags.isEmpty());
    }

    // --- Helpers ---

    private ModerationCase capturePersistedCase() {
        return caseRepository.find("eventId", eventId).firstResult();
    }

    private EventCreatedMessage buildEvent(UUID eventId, UUID organizerId, String title, String description) {
        EventCreatedMessage event = new EventCreatedMessage();
        event.eventId = eventId;
        event.organizerId = organizerId;
        event.title = title;
        event.description = description;
        return event;
    }

    private AnnouncementPostedMessage buildAnnouncement(UUID eventId, UUID organizerId, String body) {
        AnnouncementPostedMessage announcement = new AnnouncementPostedMessage();
        announcement.eventId = eventId;
        announcement.organizerId = organizerId;
        announcement.body = body;
        return announcement;
    }

    private OpenAiModerationResponse buildResponse(boolean flagged) {
        OpenAiModerationResponse.ModerationResult result = new OpenAiModerationResponse.ModerationResult();
        result.flagged = flagged;
        result.categories = new OpenAiModerationResponse.Categories();
        result.categoryScores = new OpenAiModerationResponse.CategoryScores();

        OpenAiModerationResponse response = new OpenAiModerationResponse();
        response.results = List.of(result);
        return response;
    }

    private OpenAiModerationResponse buildFlaggedResponse(
            boolean hate, boolean harassment, boolean violence, boolean selfHarm, boolean sexualMinors) {

        OpenAiModerationResponse.ModerationResult result = new OpenAiModerationResponse.ModerationResult();
        result.flagged = true;

        result.categories = new OpenAiModerationResponse.Categories();
        result.categories.hate = hate;
        result.categories.harassment = harassment;
        result.categories.violence = violence;
        result.categories.selfHarm = selfHarm;
        result.categories.sexualMinors = sexualMinors;

        result.categoryScores = new OpenAiModerationResponse.CategoryScores();
        result.categoryScores.hate = hate ? 0.87f : 0.01f;
        result.categoryScores.harassment = harassment ? 0.76f : 0.01f;
        result.categoryScores.violence = violence ? 0.91f : 0.01f;
        result.categoryScores.selfHarm = selfHarm ? 0.82f : 0.01f;
        result.categoryScores.sexualMinors = sexualMinors ? 0.95f : 0.01f;

        OpenAiModerationResponse response = new OpenAiModerationResponse();
        response.results = List.of(result);
        return response;
    }
}