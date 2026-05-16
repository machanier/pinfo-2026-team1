package ch.unige.pinfo.moderation.service;

import ch.unige.pinfo.moderation.ai.OpenAiModerationClient;
import ch.unige.pinfo.moderation.ai.OpenAiModerationRequest;
import ch.unige.pinfo.moderation.ai.OpenAiModerationResponse;
import ch.unige.pinfo.moderation.event.EventServiceClient;
import ch.unige.pinfo.moderation.messaging.AnnouncementPostedMessage;
import ch.unige.pinfo.moderation.messaging.EventCreatedMessage;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
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
    @RestClient
    EventServiceClient eventServiceClient;

    @ConfigProperty(name = "internal.service.key", defaultValue = "")
    String internalServiceKey;

    @Inject
    ModerationCaseRepository caseRepository;

    @Transactional
    public void screenEvent(EventCreatedMessage event) {
        screen(event.eventId, event.organizerId, event.title, event.description, null);
    }

    @Transactional
    public void screenAnnouncement(AnnouncementPostedMessage announcement) {
        screen(announcement.eventId, announcement.organizerId, ANNOUNCEMENT_TITLE, announcement.body,
                announcement.announcementId);
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
                        ? tryPublishAnnouncement(announcementId)
                        : tryPublishEvent(eventId);
            }

            moderationCase.status = result.flagged
                    ? ModerationStatus.PENDING
                    : (publishSucceeded ? ModerationStatus.AUTO_APPROVED : ModerationStatus.PENDING);
            moderationCase.flags = result.flagged ? extractFlags(result) : List.of();

            caseRepository.persist(moderationCase);
            LOG.infof("Screened eventId=%s → %s", eventId, moderationCase.status);

        } catch (Exception e) {
            LOG.errorf("Moderation API failed for eventId=%s: %s", eventId, e.getMessage());
            createFallbackCase(eventId, organizerId, title, announcementId);
        }
    }

    private String buildScreeningText(String title, String body) {
        return "Title: " + title + "\nDescription: " + (body != null ? body : "");
    }

    private boolean tryPublishEvent(UUID eventId) {
        try (Response response = eventServiceClient.publishEvent(eventId, internalServiceKey)) {
            if (response == null) {
                LOG.errorf("Event publish failed for eventId=%s: no response", eventId);
                return false;
            }

            if (response.getStatusInfo().getFamily() == Response.Status.Family.SUCCESSFUL) {
                return true;
            }

            LOG.errorf("Event publish failed for eventId=%s: status=%s", eventId, response.getStatus());
            return false;
        } catch (Exception e) {
            LOG.errorf("Event publish failed for eventId=%s: %s", eventId, e.getMessage());
            return false;
        }
    }

    private boolean tryPublishAnnouncement(UUID announcementId) {
        try (Response response = eventServiceClient.publishAnnouncement(announcementId, internalServiceKey)) {
            if (response == null) {
                LOG.errorf("Announcement publish failed for announcementId=%s: no response", announcementId);
                return false;
            }

            if (response.getStatusInfo().getFamily() == Response.Status.Family.SUCCESSFUL) {
                return true;
            }

            LOG.errorf("Announcement publish failed for announcementId=%s: status=%s", announcementId,
                    response.getStatus());
            return false;
        } catch (Exception e) {
            LOG.errorf("Announcement publish failed for announcementId=%s: %s", announcementId, e.getMessage());
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