package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EventCancelledConsumer {

    private static final Logger LOG = Logger.getLogger(EventCancelledConsumer.class);

    @Inject
    ModerationCaseRepository caseRepository;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event.cancelled")
    @Blocking
    public void onEventCancelled(String rawMessage) {
        try {
            EventCancelledMessage msg = objectMapper.readValue(rawMessage, EventCancelledMessage.class);
            LOG.infof("Received event.cancelled for eventId=%s", msg.eventId);

            // Remove any moderation cases linked to this event (cleanup on cancel)
            long deleted = caseRepository.delete("eventId", msg.eventId);
            LOG.infof("Deleted %d moderation cases for eventId=%s", deleted, msg.eventId);
        } catch (Exception e) {
            LOG.errorf("Failed to process event.cancelled message: %s", e.getMessage());
        }
    }
}
