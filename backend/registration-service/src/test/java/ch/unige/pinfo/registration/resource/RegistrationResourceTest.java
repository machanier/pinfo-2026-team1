package ch.unige.pinfo.registration.resource;

import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import ch.unige.pinfo.registration.service.RegistrationService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@QuarkusTest
class RegistrationResourceTest {

    @Inject
    RegistrationResource registrationResource;

    @InjectMock
    RegistrationService registrationService;

    @InjectMock
    JsonWebToken jwt;

    private final String STUDENT_ID = "student-123";

    @Test
    @DisplayName("Post: Should register when user is a student")
    void testPostRegistrationAsStudent() {
        // GIVEN
        CreateRegistrationRequest req = new CreateRegistrationRequest();
        when(jwt.getSubject()).thenReturn(STUDENT_ID);
        // On simule le claim de rôle attendu
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn("[\"Student\", \"User\"]");

        RegistrationResponse expectedResponse = new RegistrationResponse();
        when(registrationService.register(eq(STUDENT_ID), any())).thenReturn(expectedResponse);

        // WHEN
        RegistrationResponse actualResponse = registrationResource.apiRegistrationsPost(req);

        // THEN
        assertNotNull(actualResponse);
        verify(registrationService).register(eq(STUDENT_ID), eq(req));
    }

    @Test
    @DisplayName("Post: Should throw 403 when user is not a student")
    void testPostRegistrationNotStudent() {
        // GIVEN
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn("[\"Organizer\"]");

        // WHEN & THEN
        WebApplicationException ex = assertThrows(WebApplicationException.class, () -> {
            registrationResource.apiRegistrationsPost(new CreateRegistrationRequest());
        });
        assertEquals(Response.Status.FORBIDDEN.getStatusCode(), ex.getResponse().getStatus());
    }

    @Test
    @DisplayName("Post: Should throw 403 when roles claim is missing")
    void testPostRegistrationMissingRoles() {
        // GIVEN
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);

        // WHEN & THEN
        WebApplicationException ex = assertThrows(WebApplicationException.class, () -> {
            registrationResource.apiRegistrationsPost(new CreateRegistrationRequest());
        });
        assertEquals(Response.Status.FORBIDDEN.getStatusCode(), ex.getResponse().getStatus());
    }

    @Test
    @DisplayName("MeGet: Should return student registrations")
    void testGetMyRegistrations() {
        // GIVEN
        when(jwt.getSubject()).thenReturn(STUDENT_ID);
        RegistrationPage page = new RegistrationPage();
        when(registrationService.getMyRegistrations(STUDENT_ID, RegistrationStatus.CONFIRMED, 0, 10))
                .thenReturn(page);

        // WHEN
        RegistrationPage result = registrationResource.apiRegistrationsMeGet(RegistrationStatus.CONFIRMED, 0, 10);

        // THEN
        assertEquals(page, result);
    }

    @Test
    @DisplayName("GetById: Should return specific registration")
    void testGetById() {
        // GIVEN
        UUID regId = UUID.randomUUID();
        when(jwt.getSubject()).thenReturn(STUDENT_ID);
        RegistrationResponse response = new RegistrationResponse();
        when(registrationService.getById(regId, STUDENT_ID)).thenReturn(response);

        // WHEN
        RegistrationResponse result = registrationResource.apiRegistrationsRegistrationIdGet(regId);

        // THEN
        assertEquals(response, result);
    }

    @Test
    @DisplayName("Delete: Should cancel registration")
    void testDeleteRegistration() {
        // GIVEN
        UUID regId = UUID.randomUUID();
        when(jwt.getSubject()).thenReturn(STUDENT_ID);

        // WHEN
        registrationResource.apiRegistrationsRegistrationIdDelete(regId);

        // THEN
        verify(registrationService).cancel(regId, STUDENT_ID);
    }
}