package ch.unige.pinfo.moderation.event;

import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.UUID;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "event-service")
@Path("/api/events")
public interface EventServiceClient {

    @PATCH
    @Path("/{eventId}/publish")
    @Produces(MediaType.APPLICATION_JSON)
    Response publishEvent(
            @PathParam("eventId") UUID eventId,
            @HeaderParam("X-Internal-Service-Key") String internalServiceKey);
}
