package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.Event;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import io.quarkus.logging.Log;

@ApplicationScoped
public class EventChangePublisher {

    @Inject
    @Channel("event-created")
    Emitter<String> createdEmitter;

    @Inject
    @Channel("event-updated")
    Emitter<String> updatedEmitter;

    @Inject
    @Channel("event-cancelled")
    Emitter<String> cancelledEmitter;

    @Inject
    @Channel("event-submitted")
    Emitter<String> submittedEmitter;

    @Inject
    ObjectMapper objectMapper;

    /**
     * Publishes an event created message with full event details.
     * This allows subscribers (search, notifications, etc.) to immediately
     * index or process the event without fetching from the service.
     */
    public void eventCreated(Event event) {
        try {
            Map<String, Object> payload = buildEventPayload(event);
            payload.put("eventType", "CREATED");
            createdEmitter.send(objectMapper.writeValueAsString(payload));
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
            Map<String, Object> payload = buildEventPayload(event);
            payload.put("eventType", "UPDATED");
            updatedEmitter.send(objectMapper.writeValueAsString(payload));
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
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventId", eventId);
            payload.put("organizerId", organizerId);
            payload.put("eventType", "CANCELLED");
            cancelledEmitter.send(objectMapper.writeValueAsString(payload));
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
        payload.put("place", event.place);
        payload.put("time", event.time);
        payload.put("endTime", event.endTime);
        payload.put("capacity", event.capacity);
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
