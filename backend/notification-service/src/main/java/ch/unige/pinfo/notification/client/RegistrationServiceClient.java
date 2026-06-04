package ch.unige.pinfo.notification.client;

import java.util.List;
import java.util.UUID;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.eclipse.microprofile.rest.client.annotation.RegisterProvider;

@RegisterRestClient(configKey = "registration-service")
// Review S3: send X-Internal-Service-Key on calls to registration's /internal/*
// (now gated server-side by InternalSecurityFilter), consistent with this
// service's UserServiceClient.
@RegisterProvider(InternalServiceKeyFilter.class)
@Path("/internal/events")
public interface RegistrationServiceClient {

    @GET
    @Path("/{eventId}/registrations/participants")
    List<UUID> getParticipantStudentIds(@PathParam("eventId") UUID eventId);

    @GET
    @Path("/{eventId}/registrations/confirmed")
    List<UUID> getConfirmedStudentIds(@PathParam("eventId") UUID eventId);
}
