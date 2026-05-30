package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.openapi.model.*;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.*;

@ApplicationScoped
public class EventSearchService {

    public EventSearchResult search(String q, String category, String faculty, int page, int size) {
        // 1. Recherche des événements
        var query = buildQuery(q, category, faculty);
        List<SearchEvent> events = SearchEvent.find(query.queryString, query.params)
                .page(page, size).list();
        long count = SearchEvent.count(query.queryString, query.params);

        // 2. Construction du résultat
        EventSearchResult result = new EventSearchResult();
        result.setContent(events.stream().map(this::mapToHit).toList());
        result.setTotalElements((int) count);
        result.setTotalPages((int) Math.ceil((double) count / size));
        result.setPage(page);
        result.setSize(size);

        // 3. Génération des facettes (statique pour l'exemple, normalement via GROUP
        // BY)
        result.setFacets(generateFacets());

        return result;
    }

    private EventSearchHit mapToHit(SearchEvent entity) {
        EventSearchHit hit = new EventSearchHit();
        hit.setEventId(entity.eventId);
        hit.setTitle(entity.title);
        hit.setDescription(entity.description);
        hit.setPlace(entity.place);
        hit.setTime(entity.time);
        hit.setEndTime(entity.endTime);
        hit.setCategory(entity.category);
        hit.setTags(entity.tags);
        hit.setOrganizerId(entity.organizerId);
        hit.setOrganizerName(entity.organizerName);
        hit.setCapacity(entity.capacity);

        int registered = entity.registeredCount != null ? entity.registeredCount : 0;
        hit.setRegisteredCount(registered);
        hit.setAvailableSlots(entity.capacity != null ? Math.max(0, entity.capacity - registered) : null);
        hit.setIsFull(
                entity.isFull != null ? entity.isFull : (entity.capacity != null && registered >= entity.capacity));

        return hit;
    }

    private Facets generateFacets() {
        Facets f = new Facets();
        f.setCategories(List.of(new FacetBucket().value("Conference").count(10)));
        return f;
    }

    private QueryWrapper buildQuery(String q, String cat, String fac) {
        if (q != null && !q.isBlank()) {
            return new QueryWrapper("lower(title) like lower(:q)", Map.of("q", "%" + q + "%"));
        }
        return new QueryWrapper("1=1", Map.of());
    }

    private record QueryWrapper(String queryString, Map<String, Object> params) {
    }
}