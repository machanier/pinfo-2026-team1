package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.messaging.EventChangePublisher;
import ch.unige.pinfo.event.model.EventRegistrationCount;
import ch.unige.pinfo.event.repository.EventRegistrationCountRepository;
import ch.unige.pinfo.event.repository.EventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.UUID;

/**
 * Consumes registration lifecycle events from the Registration Service and
 * maintains a local projection of the confirmed-registration count per event.
 */
@ApplicationScoped
public class RegistrationEventConsumer {

    private static final Logger LOG = Logger.getLogger(RegistrationEventConsumer.class);

    @Inject
    EventRegistrationCountRepository countRepository;

    @Inject
    EventRepository eventRepository;

    @Inject
    EventChangePublisher eventPublisher;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("registration-confirmed")
    @Transactional
    public void onRegistrationConfirmed(String message) {
        try {
            var payload = objectMapper.readTree(message);
            UUID eventId = UUID.fromString(payload.get("eventId").asText());

            EventRegistrationCount count = countRepository.findByIdOptional(eventId)
                    .orElseGet(() -> {
                        EventRegistrationCount c = new EventRegistrationCount();
                        c.eventId = eventId;
                        c.registeredCount = 0;
                        return c;
                    });

            count.registeredCount++;
            countRepository.persist(count);

            LOG.debugf("registration.confirmed consumed: eventId=%s, registeredCount=%d",
                    eventId, count.registeredCount);

            // Re-publish to Kafka so the search index gets an updated registeredCount/isFull
            eventRepository.findByIdOptional(eventId).ifPresent(eventPublisher::eventUpdated);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.confirmed message");
        }
    }

    @Incoming("registration-cancelled")
    @Transactional
    public void onRegistrationCancelled(String message) {
        try {
            var payload = objectMapper.readTree(message);
            UUID eventId = UUID.fromString(payload.get("eventId").asText());

            countRepository.findByIdOptional(eventId).ifPresent(count -> {
                if (count.registeredCount > 0) {
                    count.registeredCount--;
                    countRepository.persist(count);
                    LOG.debugf("registration.cancelled consumed: eventId=%s, registeredCount=%d",
                            eventId, count.registeredCount);
                }
            });

            // Re-publish to Kafka so the search index gets an updated registeredCount/isFull
            eventRepository.findByIdOptional(eventId).ifPresent(eventPublisher::eventUpdated);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process registration.cancelled message");
        }
    }
}
