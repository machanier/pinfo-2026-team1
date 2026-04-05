package ch.unige.pinfo.registration.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;

import ch.unige.pinfo.registration.openapi.api.RegistrationsApi;
import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import ch.unige.pinfo.registration.service.RegistrationService;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.WebApplicationException;

import java.util.Collection;
import java.util.UUID;
import jakarta.ws.rs.core.Response;
import jakarta.inject.Inject;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;

@Path("/api/registrations")
@ApplicationScoped
public class RegistrationResource implements RegistrationsApi {

    @Inject
    RegistrationService registrationService;

    @Inject
    JsonWebToken jwt;

    private boolean isStudent() {
        Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");
        if (rolesClaim == null)
            return false;
        // JsonArrayImpl → convertir en string et chercher "Student"
        return rolesClaim.toString().contains("Student");
    }

    @Override
    public RegistrationResponse apiRegistrationsPost(CreateRegistrationRequest req) {

        System.out.println("=== JWT DEBUG ===");
        System.out.println("Subject: " + jwt.getSubject());
        System.out.println("Claims: " + jwt.getClaimNames());
        Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");
        System.out.println("Roles claim: " + rolesClaim);
        System.out.println("Roles claim type: " + (rolesClaim != null ? rolesClaim.getClass() : "null"));

        if (!isStudent()) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }

        String studentId = jwt.getSubject();
        return registrationService.register(studentId, req);
    }

    @Override
    public RegistrationPage apiRegistrationsMeGet(RegistrationStatus status, Integer page, Integer size) {
        // à implémenter plus tard
        throw new WebApplicationException(501);
    }

    @Override
    public RegistrationResponse apiRegistrationsRegistrationIdGet(UUID registrationId) {
        // à implémenter plus tard
        throw new WebApplicationException(501);
    }

    @Override
    public void apiRegistrationsRegistrationIdDelete(UUID registrationId) {
        // à implémenter plus tard
        throw new WebApplicationException(501);
    }

}
