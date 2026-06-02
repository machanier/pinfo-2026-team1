package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import ch.unige.pinfo.moderation.service.ModerationService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.UUID;

@ApplicationScoped
public class ModerationConsumer {

    private static final Logger LOG = Logger.getLogger(ModerationConsumer.class);

    @Inject
    ModerationService moderationService;

    @Inject
    ModerationCaseRepository caseRepository;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event-submitted")
    @Blocking
    public void onEventSubmitted(String rawMessage) {
        try {
            EventSubmittedPayload event = objectMapper.readValue(rawMessage, EventSubmittedPayload.class);
            LOG.infof("Received event.submitted for eventId=%s", event.eventId);
            moderationService.screenEvent(event.eventId, event.organizerId, event.title, event.description);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.submitted message: %s", e.getMessage());
        }
    }

    @Incoming("event-updated")
    @Blocking
    public void onEventUpdated(String rawMessage) {
        try {
            var root = objectMapper.readTree(rawMessage);

            // Support both wrapped { "action": "UPDATED", "event": { ... } }
            // and flat { "eventId": ..., ... } formats.
            var eventNode = root.hasNonNull("event") ? root.get("event") : root;

            if (eventNode == null || eventNode.isNull()) {
                LOG.warnf("Received event.updated with null inner event payload, skipping");
                return;
            }

            UUID eventId = eventNode.hasNonNull("eventId")
                    ? UUID.fromString(eventNode.get("eventId").asText()) : null;
            UUID organizerId = eventNode.hasNonNull("organizerId")
                    ? UUID.fromString(eventNode.get("organizerId").asText()) : null;

            if (eventId == null || organizerId == null) {
                LOG.warnf("Received event.updated with missing eventId/organizerId, skipping");
                return;
            }

            String title = eventNode.hasNonNull("title") ? eventNode.get("title").asText() : null;
            String description = eventNode.hasNonNull("description") ? eventNode.get("description").asText() : null;
            String status = eventNode.hasNonNull("status") ? eventNode.get("status").asText() : null;

            // Only re-screen content updates on PUBLISHED events. Every other case
            // — DRAFT, CANCELLED, a rejection, OR an absent/null status (e.g. a legacy
            // flat-format message) — is skipped: we only re-screen events we can
            // positively confirm are live. ("PUBLISHED".equals(null) is false → skip.)
            if (!"PUBLISHED".equals(status)) {
                LOG.debugf("Skipping re-screen for event.updated with status=%s (eventId=%s)", status, eventId);
                return;
            }

            LOG.infof("Received event.updated for eventId=%s (status=%s), re-screening if content changed", eventId, status);
            moderationService.reScreenEventIfChanged(eventId, organizerId, title, description);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.updated message: %s", e.getMessage());
        }
    }

    @Incoming("event-cancelled")
    @Blocking
    public void onEventCancelled(String rawMessage) {
        try {
            EventCancelledPayload msg = objectMapper.readValue(rawMessage, EventCancelledPayload.class);
            LOG.infof("Received event.cancelled for eventId=%s", msg.eventId);

            long deleted = caseRepository.delete("eventId", msg.eventId);
            LOG.infof("Deleted %d moderation cases for eventId=%s", deleted, msg.eventId);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.cancelled message: %s", e.getMessage());
        }
    }

    @Incoming("announcement-submitted")
    @Blocking
    public void onAnnouncementPosted(String rawMessage) {
        try {
            AnnouncementPostedPayload announcement = objectMapper.readValue(rawMessage,
                    AnnouncementPostedPayload.class);
            LOG.infof("Received announcement.submitted for announcementId=%s eventId=%s",
                    announcement.announcementId, announcement.eventId);
            moderationService.screenAnnouncement(
                    announcement.eventId,
                    announcement.organizerId,
                    announcement.body,
                    announcement.announcementId);
        } catch (Exception e) {
            LOG.errorf("Failed to process announcement.submitted message: %s", e.getMessage());
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class EventSubmittedPayload {
        public UUID eventId;
        public UUID organizerId;
        public String title;
        public String description;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class EventCancelledPayload {
        public UUID eventId;
        public UUID organizerId;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class AnnouncementPostedPayload {
        public UUID announcementId;
        public UUID eventId;
        public UUID organizerId;
        public String body;
    }
}
