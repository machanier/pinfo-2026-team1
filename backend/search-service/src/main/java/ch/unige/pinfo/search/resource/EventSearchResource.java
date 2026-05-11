package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.openapi.api.EventsApi;
import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import ch.unige.pinfo.search.service.EventSearchService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Path;
import java.time.LocalDate;
import java.util.UUID;

@Path("/api/search/events")
public class EventSearchResource implements EventsApi {

    @Inject
    EventSearchService searchService;

    @Override
    public EventSearchResult apiSearchEventsGet(String q, String category, LocalDate dateFrom, LocalDate dateTo,
            String place, UUID organizerId, String faculty,
            String degreeLevel, Boolean hasAvailableSlots,
            String sort, Integer page, Integer size) {
        return searchService.search(q, category, faculty, page, size);
    }
}