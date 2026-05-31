package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;

/**
 * Represents an event waiting for moderation.
 * From PENDING_MODERATION, an event can transition to PUBLISHED or DRAFT.
 * The transition from PENDING_MODERATION to DRAFT happens when the moderation
 * case has been rejected, the organizer can then modify the event.
 */
public class PendingModerationState implements EventState {

    @Override
    public EventStatus getStatus() {
        return EventStatus.PENDING_MODERATION;
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
        if (targetStatus != EventStatus.PUBLISHED && targetStatus != EventStatus.DRAFT) {
            throw new IllegalStateException(
                    "Cannot transition from PENDING_MODERATION to " + targetStatus +
                            ". PENDING_MODERATION events can only be PUBLISHED or DRAFT.");
        }

        event.status = targetStatus;
        event.saveUpdateTime();
    }
}
