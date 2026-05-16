package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.openapi.api.OrganizersApi;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchResult;
import ch.unige.pinfo.search.service.OrganizerSearchService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Path;

@Path("/api/search/organizers")
public class OrganizerSearchResource implements OrganizersApi {

    @Inject
    OrganizerSearchService organizerSearchService;

    @Override
    public OrganizerSearchResult apiSearchOrganizersGet(String q, Integer page, Integer size) {
        // Gestion des valeurs par défaut si null (selon le YAML)
        int pageNumber = (page != null) ? page : 0;
        int pageSize = (size != null) ? size : 20;

        return organizerSearchService.search(q, pageNumber, pageSize);
    }
}