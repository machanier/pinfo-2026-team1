package ch.unige.pinfo.event;

import ch.unige.pinfo.event.openapi.api.InternalApi;
import ch.unige.pinfo.event.openapi.model.CapacityInfo;
import ch.unige.pinfo.event.openapi.model.EventResponse;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.util.UUID;

@Path("/internal/events/{eventId}")
public class EventInternalResource implements InternalApi {

    @Override
    public CapacityInfo internalEventsEventIdCapacityGet(UUID eventId) {
        Event event = Event.findById(EventResource.toLongId(eventId));
        if (event == null) {
            throw new NotFoundException();
        }

        return new CapacityInfo()
                .eventId(eventId)
                .capacity(null)
                .registeredCount(0)
                .availableSlots(null)
                .isFull(false);
    }

    @Override
    public EventResponse internalEventsEventIdGet(UUID eventId) {
        Event event = Event.findById(EventResource.toLongId(eventId));
        if (event == null) {
            throw new NotFoundException();
        }
        return EventResource.toEventResponse(event);
    }
}
