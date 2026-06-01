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

    @Incoming("event.updated")
    @Blocking
    public void onEventUpdated(String rawMessage) {
        try {
            EventSubmittedPayload event = objectMapper.readValue(rawMessage, EventSubmittedPayload.class);
            LOG.infof("Received event.updated for eventId=%s", event.eventId);
            moderationService.screenEvent(event.eventId, event.organizerId, event.title, event.description);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.updated message: %s", e.getMessage());
        }
    }

    @Incoming("event.cancelled")
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
            AnnouncementPostedPayload announcement = objectMapper.readValue(rawMessage, AnnouncementPostedPayload.class);
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
