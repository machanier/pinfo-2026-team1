package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;

/**
 * Interface defining legal state transitions for events.
 * Each implementation represents a concrete event state and specifies
 * which transitions are allowed from that state.
 */
public interface EventState {
    /**
     * @return the EventStatus this state represents
     */
    EventStatus getStatus();

    /**
     * @return true if transition to PUBLISHED is allowed from this state
     */
    boolean canPublish();

    /**
     * @return true if transition to CANCELLED is allowed from this state
     */
    boolean canCancel();

    /**
     * Validates and executes the transition to the target status.
     * This method encapsulates both validation and execution logic.
     * Updates the event's status and timestamp via saveUpdateTime().
     * 
     * @param event        the event to transition
     * @param targetStatus the desired target status
     * @throws IllegalStateException if the transition is not allowed
     */
    void applyTransition(Event event, EventStatus targetStatus);
}
