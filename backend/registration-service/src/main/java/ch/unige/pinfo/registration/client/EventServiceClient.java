package ch.unige.pinfo.registration.client;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import java.util.UUID;

import ch.unige.pinfo.registration.dto.CapacityDto;
import ch.unige.pinfo.registration.dto.EventDto;

@RegisterRestClient(configKey = "event-service")
@Path("/internal")
public interface EventServiceClient {

    @GET
    @Path("/events/{eventId}")
    EventDto getEvent(@PathParam("eventId") UUID eventId);

    @GET
    @Path("/events/{eventId}/capacity")
    CapacityDto getCapacity(@PathParam("eventId") UUID eventId);
}