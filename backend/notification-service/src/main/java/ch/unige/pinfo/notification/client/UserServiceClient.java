package ch.unige.pinfo.notification.client;

import java.util.UUID;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "user-service")
@Path("/internal/users")
public interface UserServiceClient {

    @GET
    @Path("/{userId}/contact")
    UserContact getUserContact(@PathParam("userId") UUID userId,
            @HeaderParam("X-Internal-Service-Key") String internalServiceKey);
}
