package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.service.EventService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.UUID;

// A message is sent to event-flagged by the moderation service only when an updated event's
// content has been flagged (and not when a created event's content has been flagged)
@ApplicationScoped
public class EventFlaggedConsumer {

    private static final Logger LOG = Logger.getLogger(EventFlaggedConsumer.class);

    @Inject
    EventService eventService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event-flagged")
    public void onEventFlagged(String rawMessage) {
        try {
            JsonNode payload = objectMapper.readTree(rawMessage);
            UUID eventId = UUID.fromString(payload.get("eventId").asText());

            eventService.markPendingModeration(eventId);
            LOG.infof("Consumed event.flagged [eventId=%s]", eventId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process event.flagged message");
        }
    }
}
