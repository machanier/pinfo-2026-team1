package ch.unige.pinfo.user.auth0;

import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/api/v2")
@RegisterRestClient(configKey = "auth0-management")
public interface Auth0ManagementClient {

    @DELETE
    @Path("/users/{id}")
    void deleteUser(@HeaderParam("Authorization") String authorization, @PathParam("id") String userId);
}
