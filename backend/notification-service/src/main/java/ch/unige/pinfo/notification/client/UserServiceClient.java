package ch.unige.pinfo.notification.client;

import java.util.UUID;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.eclipse.microprofile.rest.client.annotation.RegisterProvider;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

@RegisterRestClient(configKey = "user-service")
@RegisterProvider(InternalServiceKeyFilter.class)
@Path("/internal")
public interface UserServiceClient {

    @GET
    @Path("/users/{userId}/contact")
    UserContact getUserContact(@PathParam("userId") UUID userId);
}
