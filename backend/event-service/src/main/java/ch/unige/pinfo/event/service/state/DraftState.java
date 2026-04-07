package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;

/**
 * Represents an event in DRAFT status.
 * From DRAFT, an event can only transition to PUBLISHED.
 */
public class DraftState implements EventState {
    @Override
    public EventStatus getStatus() {
        return EventStatus.DRAFT;
    }

    @Override
    public boolean canPublish() {
        return true;
    }

    @Override
    public boolean canCancel() {
        return false;
    }

    @Override
    public void applyTransition(Event event, EventStatus targetStatus) {
        if (targetStatus != EventStatus.PUBLISHED) {
            throw new IllegalStateException(
                    "Cannot transition from DRAFT to " + targetStatus +
                            ". DRAFT events can only be PUBLISHED.");
        }

        // Execute transition
        event.status = targetStatus;
        event.saveUpdateTime();
    }
}
