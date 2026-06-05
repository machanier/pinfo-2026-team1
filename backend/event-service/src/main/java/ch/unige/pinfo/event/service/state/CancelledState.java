package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;

/**
 * Represents an event in CANCELLED status (terminal state).
 * From CANCELLED, no transitions are allowed.
 */
public class CancelledState implements EventState {
    @Override
    public EventStatus getStatus() {
        return EventStatus.CANCELLED;
    }

    @Override
    public boolean canPublish() {
        return false;
    }

    @Override
    public boolean canCancel() {
        return false;
    }

    @Override
    public void applyTransition(Event event, EventStatus targetStatus) {
        throw new IllegalStateException(
                "Cannot transition from CANCELLED. CANCELLED is a terminal state.");
    }
}
