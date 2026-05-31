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
public class EventFlaggedPublisher {

    private static final Logger LOG = Logger.getLogger(EventFlaggedPublisher.class);

    @Inject
    @Channel("event-flagged")
    Emitter<String> flaggedEmitter;

    @Inject
    ObjectMapper objectMapper;

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
