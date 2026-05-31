package ch.unige.pinfo.moderation.service;

import ch.unige.pinfo.moderation.ai.OpenAiModerationClient;
import ch.unige.pinfo.moderation.ai.OpenAiModerationRequest;
import ch.unige.pinfo.moderation.ai.OpenAiModerationResponse;
import ch.unige.pinfo.moderation.messaging.ModerationPublisher;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ModerationService {

    private static final Logger LOG = Logger.getLogger(ModerationService.class);
    private static final String ANNOUNCEMENT_TITLE = "Announcement";

    @Inject
    @RestClient
    OpenAiModerationClient moderationClient;

    @Inject
    ModerationPublisher moderationPublisher;

    @Inject
    ModerationCaseRepository caseRepository;

    @Transactional
    public void screenEvent(UUID eventId, UUID organizerId, String title, String description) {
        screen(eventId, organizerId, title, description, null);
    }

    @Transactional
    public void screenAnnouncement(UUID eventId, UUID organizerId, String body, UUID announcementId) {
        screen(eventId, organizerId, ANNOUNCEMENT_TITLE, body, announcementId);
    }

    @Transactional
    public void createFallbackCase(UUID eventId, UUID organizerId, String title, UUID announcementId) {
        ModerationCase moderationCase = new ModerationCase();
        moderationCase.eventId = eventId;
        moderationCase.announcementId = announcementId;
        moderationCase.organizerId = organizerId;
        moderationCase.title = title;
        moderationCase.status = ModerationStatus.PENDING;
        moderationCase.createdAt = OffsetDateTime.now();
        moderationCase.flags = List.of(
                new ModerationFlag("system", "Automated screening unavailable", 0.0f));
        caseRepository.persist(moderationCase);
    }

    private void screen(UUID eventId, UUID organizerId, String title, String body, UUID announcementId) {
        try {
            // OpenAI's API expects that one text is given to the model, so we combine the
            // title and description into one string
            String text = buildScreeningText(title, body);

            OpenAiModerationResponse response = moderationClient.moderate(new OpenAiModerationRequest(text));
            OpenAiModerationResponse.ModerationResult result = response.results.get(0);

            ModerationCase moderationCase = new ModerationCase();
            moderationCase.eventId = eventId;
            moderationCase.announcementId = announcementId;
            moderationCase.organizerId = organizerId;
            moderationCase.title = title;
            moderationCase.createdAt = OffsetDateTime.now();
            boolean publishSucceeded = true;

            // If a moderation case is auto approved, publish event or announcement in the
            // event-service
            if (!result.flagged) {
                publishSucceeded = announcementId != null
                        ? emitAnnouncementDecision(announcementId, "APPROVED")
                        : emitEventDecision(eventId);
            }

            moderationCase.status = result.flagged
                    ? ModerationStatus.PENDING
                    : (publishSucceeded ? ModerationStatus.AUTO_APPROVED : ModerationStatus.PENDING);
            moderationCase.flags = result.flagged ? extractFlags(result) : List.of();

            caseRepository.persist(moderationCase);
            // If the content was flagged, inform the Event Service so that if the event is being updated,
            // (=it has status PUBLISHED), we transition it to PENDING_MODERATION
            if (result.flagged && announcementId == null) {
                try {
                    moderationPublisher.sendFlagged(eventId);
                } catch (Exception e) {
                    LOG.errorf("Failed to notify event-service about flagged eventId=%s: %s", eventId,
                            e.getMessage());
                }
            }
            LOG.infof("Screened eventId=%s → %s", eventId, moderationCase.status);

        } catch (Exception e) {
            LOG.errorf("Moderation API failed for eventId=%s: %s", eventId, e.getMessage());
            createFallbackCase(eventId, organizerId, title, announcementId);
        }
    }

    private String buildScreeningText(String title, String body) {
        return "Title: " + title + "\nDescription: " + (body != null ? body : "");
    }

    private boolean emitEventDecision(UUID eventId) {
        try {
            moderationPublisher.sendEventDecision(eventId, "APPROVED");
            return true;
        } catch (Exception e) {
            LOG.errorf("Event moderation decision publish failed for eventId=%s: %s", eventId, e.getMessage());
            return false;
        }
    }

    private boolean emitAnnouncementDecision(UUID announcementId, String status) {
        try {
            moderationPublisher.sendAnnouncementDecision(announcementId, status);
            return true;
        } catch (Exception e) {
            LOG.errorf("Announcement moderation decision publish failed for announcementId=%s: %s", announcementId,
                    e.getMessage());
            return false;
        }
    }

    // maps OpenAI category flags to our ModerationFlag entities
    private List<ModerationFlag> extractFlags(OpenAiModerationResponse.ModerationResult result) {
        List<ModerationFlag> flags = new ArrayList<>();

        if (result.categories.hate)
            flags.add(new ModerationFlag("content", "Hate speech detected", result.categoryScores.hate));

        if (result.categories.harassment)
            flags.add(new ModerationFlag("content", "Harassment detected", result.categoryScores.harassment));

        if (result.categories.violence)
            flags.add(new ModerationFlag("content", "Violence detected", result.categoryScores.violence));

        if (result.categories.selfHarm)
            flags.add(new ModerationFlag("content", "Self-harm content detected", result.categoryScores.selfHarm));

        if (result.categories.sexualMinors)
            flags.add(new ModerationFlag("content", "Inappropriate content detected",
                    result.categoryScores.sexualMinors));

        return flags;
    }
}