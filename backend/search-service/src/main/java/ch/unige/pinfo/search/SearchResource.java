package ch.unige.pinfo.search;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/search/documents")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class SearchResource {

    @GET
    public List<SearchDocument> list(@QueryParam("q") String query) {
        if (query == null || query.isBlank()) {
            return SearchDocument.listAll();
        }
        return SearchDocument.list("lower(cast(id as string)) like ?1", "%" + query.toLowerCase() + "%");
    }

    @POST
    @Transactional
    public SearchDocument create(SearchDocument payload) {
        payload.persist();
        return payload;
    }
}
