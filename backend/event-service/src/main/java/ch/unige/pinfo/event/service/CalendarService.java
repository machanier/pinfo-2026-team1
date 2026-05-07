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
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;

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

        String query = "status = :status AND time >= :startTime AND time <= :endTime";
        if (organizerId != null) {
            parameters.put("organizerId", organizerId);
            query += " AND organizerId = :organizerId";
        }

        return eventRepository.find(query, parameters);
    }
}
