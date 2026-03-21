package ch.unige.pinfo.event;

import ch.unige.pinfo.event.openapi.api.EventsApi;
import ch.unige.pinfo.event.openapi.model.ApiEventsEventIdCancelPatchRequest;
import ch.unige.pinfo.event.openapi.model.CreateEventRequest;
import ch.unige.pinfo.event.openapi.model.EventPage;
import ch.unige.pinfo.event.openapi.model.EventResponse;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.openapi.model.UpdateEventRequest;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/events")
public class EventResource implements EventsApi {

    static final Map<Long, EventStatus> EVENT_STATUS = new HashMap<>();

    @Override
    @Transactional
    public EventResponse apiEventsEventIdCancelPatch(UUID eventId,
            ApiEventsEventIdCancelPatchRequest apiEventsEventIdCancelPatchRequest) {
        Event event = Event.findById(toLongId(eventId));
        if (event == null) {
            throw new NotFoundException();
        }
        EVENT_STATUS.put(event.id, EventStatus.CANCELLED);
        return toEventResponse(event);
    }

    @Override
    @Transactional
    public void apiEventsEventIdDelete(UUID eventId) {
        Event event = Event.findById(toLongId(eventId));
        if (event == null) {
            throw new NotFoundException();
        }
        event.delete();
        EVENT_STATUS.remove(event.id);
    }

    @Override
    public EventResponse apiEventsEventIdGet(UUID eventId) {
        Event event = Event.findById(toLongId(eventId));
        if (event == null) {
            throw new NotFoundException();
        }
        return toEventResponse(event);
    }

    @Override
    @Transactional
    public EventResponse apiEventsEventIdPublishPatch(UUID eventId) {
        Event event = Event.findById(toLongId(eventId));
        if (event == null) {
            throw new NotFoundException();
        }
        EVENT_STATUS.put(event.id, EventStatus.PUBLISHED);
        return toEventResponse(event);
    }

    @Override
    @Transactional
    public EventResponse apiEventsEventIdPut(UUID eventId, UpdateEventRequest updateEventRequest) {
        Event event = Event.findById(toLongId(eventId));
        if (event == null) {
            throw new NotFoundException();
        }

        if (updateEventRequest.getTitle() != null) {
            event.title = updateEventRequest.getTitle();
        }
        if (updateEventRequest.getDescription() != null) {
            event.description = updateEventRequest.getDescription();
        }
        if (updateEventRequest.getPlace() != null) {
            event.location = updateEventRequest.getPlace();
        }

        return toEventResponse(event);
    }

    @Override
    public EventPage apiEventsGet(UUID organizerId, EventStatus status, Integer page, Integer size) {
        List<Event> allEvents = Event.listAll();
        List<EventResponse> content = new ArrayList<>();
        for (Event event : allEvents) {
            EventStatus currentStatus = EVENT_STATUS.getOrDefault(event.id, EventStatus.DRAFT);
            if (status == null || status == currentStatus) {
                content.add(toEventResponse(event));
            }
        }

        return new EventPage()
                .content(content)
                .page(page == null ? 0 : page)
                .size(size == null ? content.size() : size)
                .totalElements(content.size())
                .totalPages(1);
    }

    @Override
    @Transactional
    public EventResponse apiEventsPost(CreateEventRequest createEventRequest) {
        Event event = new Event();
        event.title = createEventRequest.getTitle();
        event.description = createEventRequest.getDescription();
        event.location = createEventRequest.getPlace();
        event.persist();
        EVENT_STATUS.put(event.id, EventStatus.DRAFT);
        return toEventResponse(event);
    }

    static EventResponse toEventResponse(Event event) {
        UUID eventId = toUuid(event.id);
        return new EventResponse()
                .eventId(eventId)
                .title(event.title)
                .description(event.description)
                .place(event.location)
                .time(OffsetDateTime.now())
                .organizerId(new UUID(0L, 1L))
                .organizerName("organizer")
                .registeredCount(0)
                .status(EVENT_STATUS.getOrDefault(event.id, EventStatus.DRAFT))
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now());
    }

    static long toLongId(UUID id) {
        return id.getLeastSignificantBits() & Long.MAX_VALUE;
    }

    static UUID toUuid(long id) {
        return new UUID(0L, id);
    }
}
