package ch.unige.pinfo.registration.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;
import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import ch.unige.pinfo.registration.service.RegistrationService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.UUID;

@Path("/api/registrations")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RegistrationResource { // <-- On a viré "implements RegistrationsApi"

    @Inject
    RegistrationService registrationService;

    @Inject
    JsonWebToken jwt;

    @POST
    @RolesAllowed("STUDENT")
    public RegistrationResponse apiRegistrationsPost(CreateRegistrationRequest req) {
        String studentId = jwt.getSubject();
        return registrationService.register(studentId, req);
    }

    @GET
    @Path("/me")
    @RolesAllowed("STUDENT")
    public RegistrationPage apiRegistrationsMeGet(
            @QueryParam("status") RegistrationStatus status,
            @QueryParam("page") @DefaultValue("0") Integer page,
            @QueryParam("size") @DefaultValue("10") Integer size) {
        String studentId = jwt.getSubject();
        return registrationService.getMyRegistrations(studentId, status, page, size);
    }

    @GET
    @Path("/{registrationId}")
    @RolesAllowed("STUDENT")
    public RegistrationResponse apiRegistrationsRegistrationIdGet(@PathParam("registrationId") UUID registrationId) {
        String studentId = jwt.getSubject();
        return registrationService.getById(registrationId, studentId);
    }

    @DELETE
    @Path("/{registrationId}")
    @RolesAllowed("STUDENT")
    public void apiRegistrationsRegistrationIdDelete(@PathParam("registrationId") UUID registrationId) {
        String studentId = jwt.getSubject();
        registrationService.cancel(registrationId, studentId);
    }
}