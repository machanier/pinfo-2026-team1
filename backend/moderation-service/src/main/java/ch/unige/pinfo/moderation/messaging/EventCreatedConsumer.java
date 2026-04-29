package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.service.ModerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EventCreatedConsumer {

    private static final Logger LOG = Logger.getLogger(EventCreatedConsumer.class);

    @Inject
    ModerationService moderationService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event-created") // matches the channel name in application.properties
    @Blocking // run in a worker thread, not the event loop
    public void onEventCreated(String rawMessage) {
        try {
            EventCreatedMessage event = objectMapper.readValue(rawMessage, EventCreatedMessage.class);
            LOG.infof("Received event.created for eventId=%s", event.eventId);
            moderationService.screenEvent(event);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.created message: %s", e.getMessage());
            // don't rethrow — a crash here would stop the consumer
        }
    }
}