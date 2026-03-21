package ch.unige.pinfo.search;

import ch.unige.pinfo.search.openapi.api.OrganizersApi;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchHit;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchResult;
import jakarta.ws.rs.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Path("/api/search/organizers")
public class SearchOrganizerResource implements OrganizersApi {

    @Override
    public OrganizerSearchResult apiSearchOrganizersGet(String q, Integer page, Integer size) {
        @SuppressWarnings("unchecked")
        List<SearchDocument> docs = (List<SearchDocument>) (List<?>) SearchDocument.listAll();
        List<OrganizerSearchHit> hits = new ArrayList<>();

        for (SearchDocument doc : docs) {
            if (doc.content == null) {
                continue;
            }
            if (q != null && !q.isBlank()
                    && !doc.content.toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT))) {
                continue;
            }
            if (doc.type != null && !"organizer".equalsIgnoreCase(doc.type)) {
                continue;
            }

            hits.add(new OrganizerSearchHit()
                    .userId(new UUID(0L, doc.id))
                    .associationName(doc.content)
                    .description(doc.content)
                    .verified(false)
                    .upcomingEventCount(0));
        }

        return new OrganizerSearchResult()
                .content(hits)
                .page(page == null ? 0 : page)
                .size(size == null ? hits.size() : size)
                .totalElements(hits.size())
                .totalPages(1);
    }
}
