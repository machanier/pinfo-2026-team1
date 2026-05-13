package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchHit;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchResult;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import jakarta.enterprise.context.ApplicationScoped;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class OrganizerSearchService {

    public OrganizerSearchResult search(String q, int page, int size) {
        // 1. Recherche dynamique (si q est présent, on cherche sur le nom ou la
        // description)
        PanacheQuery<SearchOrganizer> query;
        if (q != null && !q.isBlank()) {
            String searchPattern = "%" + q.toLowerCase() + "%";
            query = SearchOrganizer.find("lower(associationName) like :q or lower(description) like :q",
                    java.util.Collections.singletonMap("q", searchPattern));
        } else {
            query = SearchOrganizer.findAll();
        }

        // 2. Pagination
        List<SearchOrganizer> entities = query.page(page, size).list();
        long totalElements = query.count();

        // 3. Mapping vers les DTOs OpenAPI
        OrganizerSearchResult result = new OrganizerSearchResult();
        result.setContent(entities.stream().map(this::mapToHit).collect(Collectors.toList()));
        result.setPage(page);
        result.setSize(size);
        result.setTotalElements((int) totalElements);
        result.setTotalPages((int) Math.ceil((double) totalElements / size));

        return result;
    }

    private OrganizerSearchHit mapToHit(SearchOrganizer entity) {
        OrganizerSearchHit hit = new OrganizerSearchHit();
        hit.setUserId(entity.userId);
        hit.setAssociationName(entity.associationName);
        hit.setDescription(entity.description);
        hit.setLogoUrl(URI.create(entity.logoUrl));
        hit.setVerified(entity.verified);
        hit.setUpcomingEventCount(entity.upcomingEventCount);
        return hit;
    }
}