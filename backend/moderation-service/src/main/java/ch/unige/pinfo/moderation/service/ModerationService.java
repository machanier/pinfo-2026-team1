package ch.unige.pinfo.moderation.service;

import ch.unige.pinfo.moderation.ai.OpenAiModerationClient;
import ch.unige.pinfo.moderation.ai.OpenAiModerationRequest;
import ch.unige.pinfo.moderation.ai.OpenAiModerationResponse;
import ch.unige.pinfo.moderation.messaging.EventCreatedMessage;
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

@ApplicationScoped
public class ModerationService {

    private static final Logger LOG = Logger.getLogger(ModerationService.class);

    @Inject
    @RestClient
    OpenAiModerationClient moderationClient;

    @Inject
    ModerationCaseRepository caseRepository;

    @Transactional
    public void screenEvent(EventCreatedMessage event) {
        try {
            // combine title + description into one text block for screening by OpenAI
            // moderation model
            String textToScreen = "Title: " + event.title + "\n" +
                    "Description: " + (event.description != null
                            ? event.description
                            : "");

            OpenAiModerationResponse response = moderationClient.moderate(
                    new OpenAiModerationRequest(textToScreen));

            OpenAiModerationResponse.ModerationResult result = response.results.get(0);

            ModerationCase moderationCase = new ModerationCase();
            moderationCase.eventId = event.eventId;
            moderationCase.organizerId = event.organizerId;
            moderationCase.eventTitle = event.title;
            moderationCase.createdAt = OffsetDateTime.now();

            if (!result.flagged) {
                moderationCase.status = ModerationStatus.AUTO_APPROVED;
                moderationCase.flags = List.of();
            } else {
                moderationCase.status = ModerationStatus.PENDING;
                moderationCase.flags = extractFlags(result);
            }

            caseRepository.persist(moderationCase);
            LOG.infof("Screened eventId=%s → %s", event.eventId, moderationCase.status);

        } catch (Exception e) {
            LOG.errorf("Moderation API failed for eventId=%s: %s",
                    event.eventId, e.getMessage());
            createFallbackCase(event);
        }
    }

    @Transactional
    public void createFallbackCase(EventCreatedMessage event) {
        ModerationCase moderationCase = new ModerationCase();
        moderationCase.eventId = event.eventId;
        moderationCase.organizerId = event.organizerId;
        moderationCase.eventTitle = event.title;
        moderationCase.status = ModerationStatus.PENDING;
        moderationCase.createdAt = OffsetDateTime.now();
        moderationCase.flags = List.of(
                new ModerationFlag("system", "Automated screening unavailable", 0.0f));
        caseRepository.persist(moderationCase);
    }

    // maps OpenAI category flags to our ModerationFlag entities
    private List<ModerationFlag> extractFlags(
            OpenAiModerationResponse.ModerationResult result) {

        List<ModerationFlag> flags = new ArrayList<>();

        if (result.categories.hate)
            flags.add(new ModerationFlag("content", "Hate speech detected",
                    result.categoryScores.hate));

        if (result.categories.harassment)
            flags.add(new ModerationFlag("content", "Harassment detected",
                    result.categoryScores.harassment));

        if (result.categories.violence)
            flags.add(new ModerationFlag("content", "Violence detected",
                    result.categoryScores.violence));

        if (result.categories.selfHarm)
            flags.add(new ModerationFlag("content", "Self-harm content detected",
                    result.categoryScores.selfHarm));

        if (result.categories.sexualMinors)
            flags.add(new ModerationFlag("content", "Inappropriate content detected",
                    1.0f));

        return flags;
    }
}