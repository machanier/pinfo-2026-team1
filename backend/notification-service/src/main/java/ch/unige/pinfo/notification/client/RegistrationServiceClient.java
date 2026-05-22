package ch.unige.pinfo.notification.client;

import java.util.List;
import java.util.UUID;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "registration-service")
@Path("/internal/events")
public interface RegistrationServiceClient {

    @GET
    @Path("/{eventId}/registrations/participants")
    List<String> getParticipantStudentIds(@PathParam("eventId") UUID eventId);

    @GET
    @Path("/{eventId}/registrations/confirmed")
    List<String> getConfirmedStudentIds(@PathParam("eventId") UUID eventId);
}
