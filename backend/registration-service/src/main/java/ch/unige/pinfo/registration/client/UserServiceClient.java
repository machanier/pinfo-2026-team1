package ch.unige.pinfo.registration.client;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

import java.util.List;
import java.util.UUID;

@RegisterRestClient(configKey = "user-service")
@Path("/internal")
public interface UserServiceClient {

    @GET
    @Path("/users/{userId}/eligibility")
    boolean checkEligibility(
            @PathParam("userId") String userId,
            @QueryParam("faculties") List<String> faculties,
            @QueryParam("majors") List<String> majors,
            @QueryParam("degreeLevels") List<String> degreeLevels);
}