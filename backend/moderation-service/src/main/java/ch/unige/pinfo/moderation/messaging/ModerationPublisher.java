package ch.unige.pinfo.moderation.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class ModerationPublisher {

    private static final Logger LOG = Logger.getLogger(ModerationPublisher.class);

    @Inject
    @Channel("event-moderated")
    Emitter<String> eventModeratedEmitter;

    @Inject
    @Channel("announcement-moderated")
    Emitter<String> announcementModeratedEmitter;

    @Inject
    @Channel("event-flagged")
    Emitter<String> flaggedEmitter;

    @Inject
    ObjectMapper objectMapper;

    public void sendEventDecision(UUID eventId, String status) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventId", eventId);
            payload.put("status", status);
            eventModeratedEmitter.send(objectMapper.writeValueAsString(payload));
            LOG.infof("Kafka published: event.moderated [eventId=%s, status=%s]", eventId, status);
        } catch (Exception e) {
            LOG.errorf("Failed to publish event.moderated [eventId=%s]: %s", eventId, e.getMessage());
            throw new IllegalStateException("Failed to publish moderation decision", e);
        }
    }

    public void sendAnnouncementDecision(UUID announcementId, String status) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("announcementId", announcementId);
            payload.put("status", status);
            announcementModeratedEmitter.send(objectMapper.writeValueAsString(payload));
            LOG.infof("Kafka published: announcement.moderated [announcementId=%s, status=%s]", announcementId,
                    status);
        } catch (Exception e) {
            LOG.errorf("Failed to publish announcement.moderated [announcementId=%s]: %s", announcementId,
                    e.getMessage());
            throw new IllegalStateException("Failed to publish announcement moderation decision", e);
        }
    }

    public void sendFlagged(UUID eventId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventId", eventId);
            flaggedEmitter.send(objectMapper.writeValueAsString(payload));
            LOG.infof("Kafka published: event.flagged [eventId=%s]", eventId);
        } catch (Exception e) {
            LOG.errorf("Failed to publish event.flagged [eventId=%s]: %s", eventId, e.getMessage());
            throw new IllegalStateException("Failed to publish flagged event", e);
        }
    }
}
