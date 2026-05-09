package ch.unige.pinfo.registration.messaging;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;
import com.fasterxml.jackson.databind.ObjectMapper;
import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class EventCancelledConsumer {

    private static final Logger LOG = Logger.getLogger(EventCancelledConsumer.class);

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event-cancelled")
    @Transactional
    public void onEventCancelled(String message) {
        try {
            var payload = objectMapper.readTree(message);
            UUID eventId = UUID.fromString(payload.get("eventId").asText());

            List<Registration> toCancel = Registration.find(
                    "eventId = ?1 and (status = ?2 or status = ?3)",
                    eventId,
                    RegistrationStatus.CONFIRMED,
                    RegistrationStatus.WAITLISTED).list();

            LOG.infof("Cascading cancellation: %d registrations affected for eventId=%s",
                    toCancel.size(), eventId);

            toCancel.forEach(r -> {
                r.setStatus(RegistrationStatus.CANCELLED);
                r.persist();
            });

            LOG.debugf("Cascading cancellation done for eventId=%s", eventId);

        } catch (Exception e) {
            LOG.errorf(e, "Failed to process event.cancelled");
        }
    }
}
