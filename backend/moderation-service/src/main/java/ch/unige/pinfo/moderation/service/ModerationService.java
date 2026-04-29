package ch.unige.pinfo.moderation.service;

import ch.unige.pinfo.moderation.messaging.EventCreatedMessage;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import ch.unige.pinfo.moderation.ai.ModerationAiService;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.List;

@ApplicationScoped
public class ModerationService {

    private static final Logger LOG = Logger.getLogger(ModerationService.class);

    @Inject
    ModerationAiService moderationAiService;

    @Inject
    ModerationCaseRepository caseRepository;

    @Inject
    ObjectMapper objectMapper;

    @Transactional
    public void screenEvent(EventCreatedMessage event) {
        try {
            // Appel à Ollama à travers LangChain4j
            String raw = moderationAiService.moderateEvent(
                    event.title,
                    event.description != null ? event.description : "");

            AiModerationResult result = objectMapper.readValue(raw, AiModerationResult.class);

            ModerationCase moderationCase = new ModerationCase();
            moderationCase.eventId = event.eventId;
            moderationCase.organizerId = event.organizerId;
            moderationCase.eventTitle = event.title;
            moderationCase.createdAt = OffsetDateTime.now();

            if (result.approved && result.severity.equals("NONE")) {
                // Contenu approprié: approuvé automatiquement
                moderationCase.status = ModerationStatus.AUTO_APPROVED;
                moderationCase.flags = List.of();
            } else {
                // Contenu suspicieux: signalé à un admin
                moderationCase.status = ModerationStatus.PENDING;
                moderationCase.flags = List.of(
                        new ModerationFlag("description", result.reason, result.confidence));
            }

            caseRepository.persist(moderationCase);
            LOG.infof("Screened eventId=%s → %s", event.eventId, moderationCase.status);

        } catch (Exception e) {
            // down or bad response — create PENDING case for manual review
            LOG.errorf("AI screening failed for eventId=%s: %s", event.eventId, e.getMessage());
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

    // Classe interne, utilisée pour contenir les informations du JSON obtenu
    // de Ollama
    public static class AiModerationResult {
        public boolean approved;
        public String reason;
        public String severity;
        public float confidence;
    }
}