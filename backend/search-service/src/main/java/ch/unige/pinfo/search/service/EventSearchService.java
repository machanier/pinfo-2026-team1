package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.openapi.model.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@ApplicationScoped
public class EventSearchService {

    @Inject
    EntityManager em;

    public EventSearchResult search(SearchParams params) {
        var query = buildQuery(params);
        List<SearchEvent> events = SearchEvent.find(query.queryString(), query.params())
                .page(params.page(), params.size()).list();
        long count = SearchEvent.count(query.queryString(), query.params());

        EventSearchResult result = new EventSearchResult();
        result.setContent(events.stream().map(this::mapToHit).toList());
        result.setTotalElements((int) count);
        result.setTotalPages((int) Math.ceil((double) count / params.size()));
        result.setPage(params.page());
        result.setSize(params.size());
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
                                .toList());
            }

            hit.setRestrictedTo(restrictions);
        } else {
            hit.setRestrictedTo(null);
        }

        return hit;
    }

    private Facets generateFacets() {
        List<Object[]> cats = em.createNativeQuery(
                "SELECT category, COUNT(*) FROM search_events " +
                        "GROUP BY category ORDER BY COUNT(*) DESC LIMIT 20")
                .getResultList();
        List<FacetBucket> catBuckets = cats.stream()
                .map(r -> new FacetBucket().value((String) r[0]).count(((Number) r[1]).intValue()))
                .toList();

        // Niveaux d'études (reserved for future facet expansion)
        em.createNativeQuery(
                "SELECT degree_level, COUNT(DISTINCT event_id) " +
                        "FROM event_eligible_degree_levels GROUP BY degree_level")
                .getResultList();

        Facets f = new Facets();
        f.setCategories(catBuckets);
        return f;
    }

    /**
     * Returns true when the string is non-null and non-blank.
     * Extracted to reduce the cognitive complexity of {@link #buildQuery} (S3776).
     */
    private static boolean hasValue(String s) {
        return s != null && !s.isBlank();
    }

    /** Maps the sort parameter to its HQL ORDER BY clause. */
    private static String toOrderBy(String sort) {
        return "date_desc".equals(sort) ? " order by time desc" : " order by time asc";
    }

    private QueryWrapper buildQuery(SearchParams p) {
        var conditions = new ArrayList<String>();
        var params = new HashMap<String, Object>();

        if (hasValue(p.q())) {
            conditions.add(
                    "(coalesce(lower(title), '') like :q " +
                            "or coalesce(lower(description), '') like :q " +
                            "or coalesce(lower(place), '') like :q)");
            params.put("q", "%" + p.q().toLowerCase() + "%");
        }
        if (hasValue(p.category())) {
            conditions.add("category = :cat");
            params.put("cat", p.category());
        }
        if (hasValue(p.faculty())) {
            conditions.add("(:fac member of eligibleFaculties or eligibleFaculties is empty)");
            params.put("fac", p.faculty());
        }
        if (hasValue(p.degreeLevel())) {
            conditions.add("(:degreeLevel member of eligibleDegreeLevels or eligibleDegreeLevels is empty)");
            params.put("degreeLevel", p.degreeLevel().toUpperCase());
        }
        if (p.dateFrom() != null) {
            conditions.add("cast(time as date) >= :dateFrom");
            params.put("dateFrom", p.dateFrom());
        }
        if (p.dateTo() != null) {
            conditions.add("cast(time as date) <= :dateTo");
            params.put("dateTo", p.dateTo());
        }
        if (hasValue(p.place())) {
            conditions.add("lower(place) like :place");
            params.put("place", "%" + p.place().toLowerCase() + "%");
        }
        if (p.organizerId() != null) {
            conditions.add("organizerId = :organizerId");
            params.put("organizerId", p.organizerId());
        }
        if (Boolean.TRUE.equals(p.hasAvailableSlots())) {
            conditions.add("(capacity is null or registeredCount is null or registeredCount < capacity)");
        }

        String hql = conditions.isEmpty() ? "1=1" : String.join(" and ", conditions);
        return new QueryWrapper(hql + toOrderBy(p.sort()), params);
    }

    private record QueryWrapper(String queryString, Map<String, Object> params) {
    }
}
