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
public class EventModeratedPublisher {

    private static final Logger LOG = Logger.getLogger(EventModeratedPublisher.class);

    @Inject
    @Channel("event-moderated")
    Emitter<String> moderatedEmitter;

    @Inject
    ObjectMapper objectMapper;

    public void sendDecision(UUID eventId, String status) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventId", eventId);
            payload.put("status", status);
            moderatedEmitter.send(objectMapper.writeValueAsString(payload));
            LOG.infof("Kafka published: event.moderated [eventId=%s, status=%s]", eventId, status);
        } catch (Exception e) {
            LOG.errorf("Failed to publish event.moderated [eventId=%s]: %s", eventId, e.getMessage());
            throw new IllegalStateException("Failed to publish moderation decision", e);
        }
    }
}
