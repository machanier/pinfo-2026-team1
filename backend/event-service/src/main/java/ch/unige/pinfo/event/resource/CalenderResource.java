package ch.unige.pinfo.event.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;

import ch.unige.pinfo.event.openapi.api.CalendarApi;
import ch.unige.pinfo.event.openapi.model.CalendarEntry;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.service.CalendarService;
import io.quarkus.hibernate.orm.panache.PanacheQuery;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;
import java.util.UUID;
import java.util.List;

@Path("/api/events/calendar")
@Produces(MediaType.APPLICATION_JSON)
public class CalenderResource implements CalendarApi {

    @Inject
    CalendarService calendarService;

    @Inject
    JsonWebToken jwt;

    @Override
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<CalendarEntry> apiEventsCalendarGet(
            @QueryParam("from") LocalDate from,
            @QueryParam("to") LocalDate to,
            @QueryParam("organizerId") UUID organizerId) {
        if (from == null || to == null) {
            throw new BadRequestException("from and to query parameters are required");
        }

        if (from.isAfter(to)) {
            throw new BadRequestException("The starting date must be smaller than or equal to the end date");
        }

        PanacheQuery<Event> query = calendarService.getEvents(from, to, organizerId);
        List<Event> events = query.list();

        return events.stream().map(event -> {
            CalendarEntry entry = new CalendarEntry();
            entry.setEventId(event.eventId);
            entry.setTitle(event.title);
            entry.setPlace(event.place);
            entry.setTime(event.time);
            entry.setEndTime(event.endTime);
            entry.setStatus(event.status);
            entry.setCategory(event.category);
            return entry;
        }).toList();
    }

}
