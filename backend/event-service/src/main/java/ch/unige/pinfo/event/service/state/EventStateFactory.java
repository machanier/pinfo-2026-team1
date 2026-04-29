package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.openapi.model.EventStatus;

/**
 * Factory for creating EventState instances based on EventStatus.
 */
public class EventStateFactory {
    /**
     * Returns the appropriate EventState for the given status.
     * 
     * @param status the current event status
     * @return the corresponding EventState instance
     * @throws IllegalArgumentException if the status is unknown
     */
    public static EventState getState(EventStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }

        return switch (status) {
            case DRAFT -> new DraftState();
            case PUBLISHED -> new PublishedState();
            case CANCELLED -> new CancelledState();
        };
    }
}
