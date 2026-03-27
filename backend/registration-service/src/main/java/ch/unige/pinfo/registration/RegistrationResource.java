package ch.unige.pinfo.registration;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/registrations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RegistrationResource {

    @GET
    public List<Registration> list(@QueryParam("q") String query) {
        if (query == null || query.isBlank()) {
            return Registration.listAll();
        }
        return Registration.list("lower(cast(id as string)) like ?1", "%" + query.toLowerCase() + "%");
    }

    @POST
    @Transactional
    public Registration create(Registration payload) {
        payload.persist();
        return payload;
    }
}
