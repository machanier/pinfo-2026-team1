package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.model.SearchEvent;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.*;

@Path("/api/search/events/suggestions")
@Produces(MediaType.APPLICATION_JSON)
public class SuggestionResource {

    @GET
    public Map<String, List<String>> getSuggestions(@QueryParam("q") String q,
            @QueryParam("limit") @DefaultValue("8") int limit) {
        if (q == null || q.length() < 2)
            return Map.of("suggestions", List.of());

        List<String> suggestions = SearchEvent.find("lower(title) like ?1", "%" + q.toLowerCase() + "%")
                .project(String.class)
                .page(0, limit)
                .list();

        return Map.of("suggestions", suggestions);
    }
}