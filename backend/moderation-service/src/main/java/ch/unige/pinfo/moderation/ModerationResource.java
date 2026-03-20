package ch.unige.pinfo.moderation;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/moderation/flags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ModerationResource {

    @GET
    public List<ModerationFlag> list(@QueryParam("q") String query) {
        if (query == null || query.isBlank()) {
            return ModerationFlag.listAll();
        }
        return ModerationFlag.list("lower(cast(id as string)) like ?1", "%" + query.toLowerCase() + "%");
    }

    @POST
    @Transactional
    public ModerationFlag create(ModerationFlag payload) {
        payload.persist();
        return payload;
    }
}
