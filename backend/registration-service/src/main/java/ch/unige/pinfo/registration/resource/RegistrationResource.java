package ch.unige.pinfo.registration.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;

import ch.unige.pinfo.registration.openapi.api.RegistrationsApi;
import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import ch.unige.pinfo.registration.service.RegistrationService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Path;

import java.util.UUID;

@Path("/api/registrations")
@ApplicationScoped
@RolesAllowed("STUDENT")
public class RegistrationResource implements RegistrationsApi {

    @Inject
    RegistrationService registrationService;

    @Inject
    JsonWebToken jwt;

    @Override
    public RegistrationResponse apiRegistrationsPost(CreateRegistrationRequest req) {
        String subject = jwt.getSubject();
        UUID studentId = UUID.nameUUIDFromBytes(subject.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return registrationService.register(studentId, req);
    }

    @Override
    public RegistrationPage apiRegistrationsMeGet(RegistrationStatus status, Integer page, Integer size) {
        String subject = jwt.getSubject();
        UUID studentId = UUID.nameUUIDFromBytes(subject.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return registrationService.getMyRegistrations(studentId, status, page, size);
    }

    @Override
    public RegistrationResponse apiRegistrationsRegistrationIdGet(UUID registrationId) {
        String subject = jwt.getSubject();
        UUID studentId = UUID.nameUUIDFromBytes(subject.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return registrationService.getById(registrationId, studentId);
    }

    @Override
    public void apiRegistrationsRegistrationIdDelete(UUID registrationId) {
        String subject = jwt.getSubject();
        UUID studentId = UUID.nameUUIDFromBytes(subject.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        registrationService.cancel(registrationId, studentId);
    }

}
