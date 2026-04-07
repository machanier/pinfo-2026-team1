package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;

/**
 * Represents an event in PUBLISHED status.
 * From PUBLISHED, an event can only transition to CANCELLED.
 */
public class PublishedState implements EventState {
    @Override
    public EventStatus getStatus() {
        return EventStatus.PUBLISHED;
    }

    @Override
    public boolean canPublish() {
        return false;
    }

    @Override
    public boolean canCancel() {
        return true;
    }

    @Override
    public void applyTransition(Event event, EventStatus targetStatus) {
        if (targetStatus != EventStatus.CANCELLED) {
            throw new IllegalStateException(
                    "Cannot transition from PUBLISHED to " + targetStatus +
                            ". PUBLISHED events can only be CANCELLED.");
        }

        // Execute transition
        event.status = targetStatus;
        event.saveUpdateTime();
    }
}
