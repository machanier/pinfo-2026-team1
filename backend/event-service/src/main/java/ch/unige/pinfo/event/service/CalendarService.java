package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class CalendarService {

    @Inject
    EventRepository eventRepository;

    /**
     * Gets all published events within a date range.
     *
     * @param startDate   start of date range (inclusive) to filter by
     * @param endDate     end of date range (inclusive) to filter by
     * @param organizerId the ID of an organizer to filter by
     * @return the query according to the filters
     */
    public PanacheQuery<Event> getEvents(LocalDate startDate, LocalDate endDate, UUID organizerId) {
        OffsetDateTime startTime = startDate.atTime(LocalTime.MIN).atOffset(ZoneOffset.UTC);
        OffsetDateTime endTime = endDate.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("startTime", startTime);
        parameters.put("endTime", endTime);
        parameters.put("status", EventStatus.PUBLISHED);

        // PINFO-212: build the WHERE clause from a List<String> joined with " AND "
        // instead of mutating a String with `+=`. The previous shape was
        // technically safe (every value is bound by named parameter), but the
        // pattern would silently turn into JPQL injection the day a teammate
        // appended `" AND title LIKE '" + userInput + "'"`. A list of fixed
        // fragments has no way to splice user input into the query text.
        List<String> conditions = new ArrayList<>();
        conditions.add("status = :status");
        conditions.add("time >= :startTime");
        conditions.add("time <= :endTime");
        if (organizerId != null) {
            parameters.put("organizerId", organizerId);
            conditions.add("organizerId = :organizerId");
        }

        return eventRepository.find(String.join(" AND ", conditions), parameters);
    }
}
