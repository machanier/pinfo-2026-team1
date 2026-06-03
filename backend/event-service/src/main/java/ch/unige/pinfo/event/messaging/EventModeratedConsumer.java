package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.service.EventService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.UUID;

@ApplicationScoped
public class EventModeratedConsumer {

    private static final Logger LOG = Logger.getLogger(EventModeratedConsumer.class);

    @Inject
    EventService eventService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event-moderated")
    public void onEventModerated(String rawMessage) {
        try {
            JsonNode payload = objectMapper.readTree(rawMessage);
            UUID eventId = UUID.fromString(payload.get("eventId").asText());
            String status = payload.get("status").asText();

            eventService.applyModerationDecision(eventId, status);
            LOG.infof("Consumed event.moderated [eventId=%s, status=%s]", eventId, status);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process event.moderated message");
        }
    }
}
