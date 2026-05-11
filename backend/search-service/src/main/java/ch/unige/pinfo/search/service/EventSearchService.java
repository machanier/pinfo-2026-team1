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

        // 3. Génération des facettes (statique pour l'exemple, normalement via GROUP
        // BY)
        result.setFacets(generateFacets());

        return result;
    }

    private EventSearchHit mapToHit(SearchEvent entity) {
        EventSearchHit hit = new EventSearchHit();
        hit.setEventId(entity.eventId);
        hit.setTitle(entity.title);
        hit.setCategory(entity.category);
        hit.setRegisteredCount(entity.registeredCount);
        hit.setIsFull(entity.capacity != null && entity.registeredCount >= entity.capacity);
        return hit;
    }

    private Facets generateFacets() {
        Facets f = new Facets();
        f.setCategories(List.of(new FacetBucket().value("Conference").count(10)));
        return f;
    }

    private QueryWrapper buildQuery(String q, String cat, String fac) {
        // Logique de construction dynamique de chaîne HQL
        return new QueryWrapper("1=1", Map.of());
    }

    private record QueryWrapper(String queryString, Map<String, Object> params) {
    }
}