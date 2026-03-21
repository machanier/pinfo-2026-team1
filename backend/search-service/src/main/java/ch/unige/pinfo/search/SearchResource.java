package ch.unige.pinfo.search;

import ch.unige.pinfo.search.openapi.api.EventsApi;
import ch.unige.pinfo.search.openapi.model.ApiSearchEventsSuggestionsGet200Response;
import ch.unige.pinfo.search.openapi.model.EventSearchHit;
import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import jakarta.ws.rs.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Path("/api/search/events")
public class SearchResource implements EventsApi {

    @Override
    public EventSearchResult apiSearchEventsGet(
            String q,
            String category,
            LocalDate dateFrom,
            LocalDate dateTo,
            String place,
            UUID organizerId,
            String faculty,
            String degreeLevel,
            Boolean hasAvailableSlots,
            String sort,
            Integer page,
            Integer size) {
        @SuppressWarnings("unchecked")
        List<SearchDocument> docs = (List<SearchDocument>) (List<?>) SearchDocument.listAll();
        List<EventSearchHit> hits = new ArrayList<>();

        for (SearchDocument doc : docs) {
            if (q != null && !q.isBlank() && (doc.content == null
                    || !doc.content.toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT)))) {
                continue;
            }
            hits.add(new EventSearchHit()
                    .eventId(toUuid(doc.id))
                    .title(doc.content)
                    .description(doc.content)
                    .place("unknown")
                    .time(OffsetDateTime.now())
                    .organizerId(new UUID(0L, 1L))
                    .organizerName("organizer")
                    .registeredCount(0)
                    .isFull(false));
        }

        return new EventSearchResult()
                .content(hits)
                .page(page == null ? 0 : page)
                .size(size == null ? hits.size() : size)
                .totalElements(hits.size())
                .totalPages(1);
    }

    @Override
    public ApiSearchEventsSuggestionsGet200Response apiSearchEventsSuggestionsGet(String q, Integer limit) {
        int max = limit == null ? 8 : Math.min(limit, 8);
        List<String> suggestions = new ArrayList<>();

        @SuppressWarnings("unchecked")
        List<SearchDocument> docs = (List<SearchDocument>) (List<?>) SearchDocument.listAll();
        for (SearchDocument doc : docs) {
            if (doc.content == null) {
                continue;
            }
            if (q == null || q.isBlank() || doc.content.toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT))) {
                suggestions.add(doc.content);
            }
            if (suggestions.size() >= max) {
                break;
            }
        }

        return new ApiSearchEventsSuggestionsGet200Response().suggestions(suggestions);
    }

    private static UUID toUuid(long id) {
        return new UUID(0L, id);
    }
}
