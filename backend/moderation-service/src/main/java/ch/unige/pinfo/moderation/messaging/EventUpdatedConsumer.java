package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.service.ModerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EventUpdatedConsumer {

    private static final Logger LOG = Logger.getLogger(EventUpdatedConsumer.class);

    @Inject
    ModerationService moderationService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event.updated")
    @Blocking
    public void onEventUpdated(String rawMessage) {
        try {
            EventCreatedMessage event = objectMapper.readValue(rawMessage, EventCreatedMessage.class);
            LOG.infof("Received event.updated for eventId=%s", event.eventId);
            // Re-screen updated content. Current service exposes `screenEvent` which
            // creates/updates moderation cases; reuse for now.
            moderationService.screenEvent(event);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.updated message: %s", e.getMessage());
        }
    }
}
