package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import ch.unige.pinfo.event.service.state.EventStateFactory;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@ApplicationScoped
public class EventService {

    @Inject
    EventRepository eventRepository;

    /**
     * Gets all events according to a set of filters. If no filter is given, gets
     * all events.
     * 
     * @param organizerId the ID of an organizer to filter by
     * @param status      the status (DRAFT, PUBLISHED, CANCELLED) to filter by
     * @return the query according to the filters
     */
    public PanacheQuery<Event> getEvents(UUID organizerId, EventStatus status) {
        Map<String, Object> parameters = new HashMap<>();
        if (organizerId != null)
            parameters.put("organizerId", organizerId);
        if (status != null)
            parameters.put("status", status);

        if (parameters.isEmpty()) {
            return eventRepository.findAll();
        }

        // Create the query from the parameters
        String query = parameters.keySet().stream()
                .map(key -> key + " = :" + key)
                .collect(Collectors.joining(" AND "));

        return eventRepository.find(query, parameters);

    }

    /**
     * Creates an event and persists it in the database.
     * 
     * @param request contains the information of the event to create
     * @return the created event
     */
    @Transactional
    public Event createEvent(Event request) {
        Event event = new Event();
        event.organizerId = request.organizerId;
        event.status = EventStatus.DRAFT;
        event.saveCreationTime();
        event.updatedAt = event.createdAt;
        event.title = request.title;
        event.description = request.description;
        event.place = request.place;
        event.time = request.time;
        event.endTime = request.endTime;
        event.capacity = request.capacity;
        event.category = request.category;
        event.tags = request.tags;
        event.restrictedTo = request.restrictedTo;

        eventRepository.persist(event);
        return event;
    }

    /**
     * Publishes a DRAFT event, transitioning it to PUBLISHED status.
     * 
     * @param eventId the ID of the event to publish
     * @return the updated event
     * @throws IllegalStateException    if the event cannot be published
     *                                  (e.g., already published or cancelled)
     * @throws IllegalArgumentException if the event does not exist
     */
    @Transactional
    public Event publishEvent(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        // Get current state and apply transition (validates + executes)
        var currentState = EventStateFactory.getState(event.status);
        currentState.applyTransition(event, EventStatus.PUBLISHED);

        // Persist the updated event
        eventRepository.persist(event);
        return event;
    }

    /**
     * Cancels a PUBLISHED event, transitioning it to CANCELLED status.
     * 
     * @param eventId the ID of the event to cancel
     * @return the updated event
     * @throws IllegalStateException    if the event cannot be cancelled
     *                                  (e.g., still in DRAFT or already cancelled)
     * @throws IllegalArgumentException if the event does not exist
     */
    @Transactional
    public Event cancelEvent(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        // Get current state and apply transition (validates + executes)
        var currentState = EventStateFactory.getState(event.status);
        currentState.applyTransition(event, EventStatus.CANCELLED);

        // Persist the updated event
        eventRepository.persist(event);
        return event;
    }

    /**
     * Retrieves an event by its ID.
     * 
     * @param eventId the ID of the event
     * @return an Optional containing the event if found, empty otherwise
     */
    public Optional<Event> getEventById(UUID eventId) {
        return eventRepository.findByIdOptional(eventId);
    }

}
