package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.repository.EventRegistrationCountRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class EventChangePublisher {

    private final Emitter<String> createdEmitter;
    private final Emitter<String> updatedEmitter;
    private final Emitter<String> cancelledEmitter;
    private final Emitter<String> submittedEmitter;
    private final EventRegistrationCountRepository registrationCountRepository;
    private final ObjectMapper objectMapper;

    @Inject
    public EventChangePublisher(
            @Channel("event-created") Emitter<String> createdEmitter,
            @Channel("event-updated") Emitter<String> updatedEmitter,
            @Channel("event-cancelled") Emitter<String> cancelledEmitter,
            @Channel("event-submitted") Emitter<String> submittedEmitter,
            EventRegistrationCountRepository registrationCountRepository,
            ObjectMapper objectMapper) {
        this.createdEmitter = createdEmitter;
        this.updatedEmitter = updatedEmitter;
        this.cancelledEmitter = cancelledEmitter;
        this.submittedEmitter = submittedEmitter;
        this.registrationCountRepository = registrationCountRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Publishes an event created message with full event details.
     * This allows subscribers (search, notifications, etc.) to immediately
     * index or process the event without fetching from the service.
     */
    public void eventCreated(Event event) {
        try {
            Map<String, Object> envelope = new HashMap<>();
            envelope.put("action", "CREATED");
            envelope.put("event", buildEventPayload(event));
            createdEmitter.send(objectMapper.writeValueAsString(envelope));
            Log.infof("Kafka published: event.created [eventId=%s]", event.eventId);
        } catch (Exception e) {
            Log.errorf("Failed to publish event.created [eventId=%s]: %s", event.eventId, e.getMessage());
        }
    }

    /**
     * Publishes an event updated message with full event details.
     */
    public void eventUpdated(Event event) {
        try {
            Map<String, Object> envelope = new HashMap<>();
            envelope.put("action", "UPDATED");
            envelope.put("event", buildEventPayload(event));
            updatedEmitter.send(objectMapper.writeValueAsString(envelope));
            Log.infof("Kafka published: event.updated [eventId=%s]", event.eventId);
        } catch (Exception e) {
            Log.errorf("Failed to publish event.updated [eventId=%s]: %s", event.eventId, e.getMessage());
        }
    }

    /**
     * Publishes an event cancelled message.
     * Subscribers only need IDs to invalidate cached data.
     */
    public void eventCancelled(UUID eventId, UUID organizerId) {
        try {
            Map<String, Object> eventData = new HashMap<>();
            eventData.put("eventId", eventId);
            eventData.put("organizerId", organizerId);

            Map<String, Object> envelope = new HashMap<>();
            envelope.put("action", "CANCELLED");
            envelope.put("event", eventData);

            cancelledEmitter.send(objectMapper.writeValueAsString(envelope));
            Log.infof("Kafka published: event.cancelled [eventId=%s]", eventId);
        } catch (Exception e) {
            Log.errorf("Failed to publish event.cancelled [eventId=%s]: %s", eventId, e.getMessage());
        }
    }

    /**
     * Publishes an event submitted message for moderation.
     */
    public void eventSubmitted(Event event) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventId", event.eventId);
            payload.put("organizerId", event.organizerId);
            payload.put("title", event.title);
            payload.put("description", event.description);
            submittedEmitter.send(objectMapper.writeValueAsString(payload));
            Log.infof("Kafka published: event.submitted [eventId=%s]", event.eventId);
        } catch (Exception e) {
            Log.errorf("Failed to publish event.submitted [eventId=%s]: %s", event.eventId, e.getMessage());
        }
    }

    /**
     * Builds a complete event payload for Kafka messages.
     * Includes all obligatory fields to avoid downstream queries.
     */
    private Map<String, Object> buildEventPayload(Event event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventId", event.eventId);
        payload.put("organizerId", event.organizerId);
        payload.put("title", event.title);
        payload.put("description", event.description);
        payload.put("organizerName", event.organizerName);
        payload.put("place", event.place);
        payload.put("time", event.time);
        payload.put("endTime", event.endTime);
        payload.put("capacity", event.capacity);
        int registeredCount = registrationCountRepository.findByIdOptional(event.eventId)
                .map(c -> c.registeredCount)
                .orElse(0);
        payload.put("registeredCount", registeredCount);
        payload.put("category", event.category);
        payload.put("status", event.status);
        payload.put("createdAt", event.createdAt);
        payload.put("updatedAt", event.updatedAt);
        if (event.tags != null) {
            payload.put("tags", event.tags);
        }
        if (event.restrictedTo != null) {
            payload.put("restrictedTo", event.restrictedTo);
        }
        return payload;
    }
}
