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
public class AnnouncementModeratedPublisher {

    private static final Logger LOG = Logger.getLogger(AnnouncementModeratedPublisher.class);

    @Inject
    @Channel("announcement-moderated")
    Emitter<String> moderatedEmitter;

    @Inject
    ObjectMapper objectMapper;

    public void sendDecision(UUID announcementId, String status) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("announcementId", announcementId);
            payload.put("status", status);
            moderatedEmitter.send(objectMapper.writeValueAsString(payload));
            LOG.infof("Kafka published: announcement.moderated [announcementId=%s, status=%s]", announcementId,
                    status);
        } catch (Exception e) {
            LOG.errorf("Failed to publish announcement.moderated [announcementId=%s]: %s", announcementId,
                    e.getMessage());
            throw new IllegalStateException("Failed to publish announcement moderation decision", e);
        }
    }
}
