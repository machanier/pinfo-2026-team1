package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.service.ModerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EventSubmittedConsumer {

    private static final Logger LOG = Logger.getLogger(EventSubmittedConsumer.class);

    @Inject
    ModerationService moderationService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event-submitted")
    @Blocking
    public void onEventSubmitted(String rawMessage) {
        try {
            EventSubmittedMessage event = objectMapper.readValue(rawMessage, EventSubmittedMessage.class);
            LOG.infof("Received event.submitted for eventId=%s", event.eventId);
            moderationService.screenEvent(event);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.submitted message: %s", e.getMessage());
        }
    }
}
