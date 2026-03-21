package ch.unige.pinfo.event;

import ch.unige.pinfo.event.openapi.api.CalendarApi;
import ch.unige.pinfo.event.openapi.model.CalendarEntry;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import jakarta.ws.rs.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/api/events/calendar")
public class EventCalendarResource implements CalendarApi {

    @Override
    public List<CalendarEntry> apiEventsCalendarGet(LocalDate from, LocalDate to, UUID organizerId) {
        List<Event> events = Event.listAll();
        List<CalendarEntry> entries = new ArrayList<>();

        for (Event event : events) {
            entries.add(new CalendarEntry()
                    .eventId(EventResource.toUuid(event.id))
                    .title(event.title)
                    .place(event.location)
                    .time(OffsetDateTime.now())
                    .status(EventResource.EVENT_STATUS.getOrDefault(event.id, EventStatus.DRAFT))
                    .category("general"));
        }

        return entries;
    }
}
