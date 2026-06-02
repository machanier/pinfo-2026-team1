package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.openapi.model.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;

@ApplicationScoped
public class EventSearchService {

    @Inject
    EntityManager em;

    public EventSearchResult search(String q, String category, String faculty,
            LocalDate dateFrom, LocalDate dateTo,
            String place, UUID organizerId, Boolean hasAvailableSlots,
            String sort, int page, int size) {
        var query = buildQuery(q, category, faculty, dateFrom, dateTo, place, organizerId, hasAvailableSlots, sort);
        List<SearchEvent> events = SearchEvent.find(query.queryString(), query.params())
                .page(page, size).list();
        long count = SearchEvent.count(query.queryString(), query.params());

        EventSearchResult result = new EventSearchResult();
        result.setContent(events.stream().map(this::mapToHit).toList());
        result.setTotalElements((int) count);
        result.setTotalPages((int) Math.ceil((double) count / size));
        result.setPage(page);
        result.setSize(size);
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

        if ((entity.eligibleFaculties != null && !entity.eligibleFaculties.isEmpty()) ||
                (entity.eligibleDegreeLevels != null && !entity.eligibleDegreeLevels.isEmpty())) {

            EligibilityRuleSummary restrictions = new EligibilityRuleSummary();
            restrictions.setFaculties(entity.eligibleFaculties);

            if (entity.eligibleDegreeLevels != null) {
                restrictions.setDegreeLevels(
                        entity.eligibleDegreeLevels.stream()
                                .map(levelStr -> {
                                    try {
                                        return EligibilityRuleSummary.DegreeLevelsEnum
                                                .fromValue(levelStr.toUpperCase());
                                    } catch (IllegalArgumentException e) {
                                        return null;
                                    }
                                })
                                .filter(Objects::nonNull)
                                .toList() // L'inférence de type se base ici directement sur le setter
                );
            }

            hit.setRestrictedTo(restrictions);
        } else {
            hit.setRestrictedTo(null);
        }

        return hit;
    }

    private Facets generateFacets(/* passer les mêmes filtres actifs */) {
        // Catégories
        List<Object[]> cats = em.createNativeQuery(
                "SELECT category, COUNT(*) FROM search_events " +
                        "GROUP BY category ORDER BY COUNT(*) DESC LIMIT 20")
                .getResultList();
        List<FacetBucket> catBuckets = cats.stream()
                .map(r -> new FacetBucket().value((String) r[0]).count(((Number) r[1]).intValue()))
                .toList();

        // Niveaux d'études
        List<Object[]> levels = em.createNativeQuery(
                "SELECT degree_level, COUNT(DISTINCT event_id) " +
                        "FROM event_eligible_degree_levels GROUP BY degree_level")
                .getResultList();
        // ... idem pour les lieux (place)

        Facets f = new Facets();
        f.setCategories(catBuckets);
        return f;
    }

    private QueryWrapper buildQuery(String q, String cat, String fac,
            LocalDate dateFrom, LocalDate dateTo,
            String place, UUID organizerId, Boolean hasAvailableSlots, String sort) {
        var conditions = new ArrayList<String>();
        var params = new HashMap<String, Object>();

        if (q != null && !q.isBlank()) {
            conditions.add("(lower(title) like :q or lower(description) like :q)");
            params.put("q", "%" + q.toLowerCase() + "%");
        }
        if (cat != null && !cat.isBlank()) {
            conditions.add("category = :cat");
            params.put("cat", cat);
        }
        if (fac != null && !fac.isBlank()) {
            conditions.add("(:fac member of eligibleFaculties or eligibleFaculties is empty)");
            params.put("fac", fac);
        }
        if (dateFrom != null) {
            conditions.add("cast(time as date) >= :dateFrom");
            params.put("dateFrom", dateFrom);
        }
        if (dateTo != null) {
            conditions.add("cast(time as date) <= :dateTo");
            params.put("dateTo", dateTo);
        }
        if (place != null && !place.isBlank()) {
            conditions.add("lower(place) like :place");
            params.put("place", "%" + place.toLowerCase() + "%");
        }
        if (organizerId != null) {
            conditions.add("organizerId = :organizerId");
            params.put("organizerId", organizerId);
        }
        if (Boolean.TRUE.equals(hasAvailableSlots)) {
            // registeredCount is null when EventChangePublisher has not yet published it.
            // Treat null as 0 (no registrations) so events with an unknown count are
            // included rather than silently excluded.
            conditions.add("(capacity is null or registeredCount is null or registeredCount < capacity)");
        }

        String hql = conditions.isEmpty() ? "1=1" : String.join(" and ", conditions);
        String orderBy = switch (sort == null ? "date_asc" : sort) {
            case "date_desc" -> " order by time desc";
            default -> " order by time asc";
        };
        return new QueryWrapper(hql + orderBy, params);
    }

    private record QueryWrapper(String queryString, Map<String, Object> params) {
    }
}