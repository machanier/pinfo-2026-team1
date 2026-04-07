package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import ch.unige.pinfo.event.service.state.EventStateFactory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.UUID;

@ApplicationScoped
public class EventService {
    
    @Inject
    EventRepository eventRepository;

    /**
     * Publishes a DRAFT event, transitioning it to PUBLISHED status.
     * 
     * @param eventId the ID of the event to publish
     * @return the updated event
     * @throws IllegalStateException if the event cannot be published
     *         (e.g., already published or cancelled)
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
     * @throws IllegalStateException if the event cannot be cancelled
     *         (e.g., still in DRAFT or already cancelled)
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
}
