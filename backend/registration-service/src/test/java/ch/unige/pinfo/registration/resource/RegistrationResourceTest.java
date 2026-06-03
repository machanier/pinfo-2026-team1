package ch.unige.pinfo.registration.resource;

import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import ch.unige.pinfo.registration.service.RegistrationService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import io.restassured.http.ContentType;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@QuarkusTest
class RegistrationResourceTest {

    @InjectMock
    RegistrationService registrationService;

    private static final UUID EVENT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID REG_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final String TEST_STUDENT = "auth0|test-student-id";
    private static final String TEST_ORGANIZER = "auth0|test-organizer-id";
    private static final UUID STUDENT = UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2");
    private static final UUID ORGANIZER = UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59d4");

    // ─── POST /api/registrations ───────────────────────────────────────────────

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void post_returns200WhenStudentRegisters() {
        RegistrationResponse resp = new RegistrationResponse();
        resp.setRegistrationId(REG_ID);
        resp.setEventId(EVENT_ID);
        resp.setStudentId(STUDENT);
        resp.setStatus(RegistrationStatus.CONFIRMED);
        when(registrationService.register(eq(STUDENT), any())).thenReturn(resp);

        given()
                .contentType(ContentType.JSON)
                .body("{\"eventId\":\"" + EVENT_ID + "\"}")
                .when()
                .post("/api/registrations")
                .then()
                .statusCode(anyOf(is(200), is(201)))
                .body("status", equalTo("CONFIRMED"))
                .body("registrationId", equalTo(REG_ID.toString()));
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_ORGANIZER))
    void post_returns403WhenCallerIsNotStudent() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"eventId\":\"" + EVENT_ID + "\"}")
                .when()
                .post("/api/registrations")
                .then()
                .statusCode(403);

        verify(registrationService, never()).register(any(), any());
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = {})
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void post_returns403WhenCallerHasNoRole() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"eventId\":\"" + EVENT_ID + "\"}")
                .when()
                .post("/api/registrations")
                .then()
                .statusCode(403);

        verify(registrationService, never()).register(any(), any());
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void post_returns409WhenAlreadyRegistered() {
        when(registrationService.register(eq(STUDENT), any()))
                .thenThrow(new WebApplicationException(Response.Status.CONFLICT));

        given()
                .contentType(ContentType.JSON)
                .body("{\"eventId\":\"" + EVENT_ID + "\"}")
                .when()
                .post("/api/registrations")
                .then()
                .statusCode(409);
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void post_returns400WhenEventNotPublished() {
        when(registrationService.register(eq(STUDENT), any()))
                .thenThrow(new WebApplicationException(Response.Status.BAD_REQUEST));

        given()
                .contentType(ContentType.JSON)
                .body("{\"eventId\":\"" + EVENT_ID + "\"}")
                .when()
                .post("/api/registrations")
                .then()
                .statusCode(400);
    }

    // ─── GET /api/registrations/me ─────────────────────────────────────────────

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void getMe_returns200WithRegistrations() {
        RegistrationResponse reg = new RegistrationResponse();
        reg.setRegistrationId(REG_ID);
        reg.setEventId(EVENT_ID);
        reg.setStudentId(STUDENT);
        reg.setStatus(RegistrationStatus.CONFIRMED);

        RegistrationPage page = new RegistrationPage();
        page.setContent(List.of(reg));
        page.setPage(0);
        page.setSize(10);
        page.setTotalElements(1);
        page.setTotalPages(1);

        when(registrationService.getMyRegistrations(eq(STUDENT), any(), eq(0), eq(10)))
                .thenReturn(page);

        given()
                .queryParam("page", 0)
                .queryParam("size", 10)
                .when()
                .get("/api/registrations/me")
                .then()
                .statusCode(200)
                .body("totalElements", equalTo(1))
                .body("content[0].status", equalTo("CONFIRMED"));
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_ORGANIZER))
    void getMe_returns403WhenCallerIsNotStudent() {
        given()
                .queryParam("page", 0)
                .queryParam("size", 10)
                .when()
                .get("/api/registrations/me")
                .then()
                .statusCode(403);

        verify(registrationService, never()).getMyRegistrations(any(), any(), anyInt(), anyInt());
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void getMe_returns200EmptyWhenNone() {
        RegistrationPage page = new RegistrationPage();
        page.setContent(List.of());
        page.setTotalElements(0);
        page.setTotalPages(0);
        page.setPage(0);
        page.setSize(10);

        when(registrationService.getMyRegistrations(eq(STUDENT), any(), eq(0), eq(10)))
                .thenReturn(page);

        given()
                .queryParam("page", 0)
                .queryParam("size", 10)
                .when()
                .get("/api/registrations/me")
                .then()
                .statusCode(200)
                .body("totalElements", equalTo(0));
    }

    // ─── GET /api/registrations/{id} ───────────────────────────────────────────

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void getById_returns200WhenOwner() {
        RegistrationResponse resp = new RegistrationResponse();
        resp.setRegistrationId(REG_ID);
        resp.setStudentId(STUDENT);
        resp.setEventId(EVENT_ID);
        resp.setStatus(RegistrationStatus.CONFIRMED);

        when(registrationService.getById(eq(REG_ID), eq(STUDENT))).thenReturn(resp);

        given()
                .when()
                .get("/api/registrations/" + REG_ID)
                .then()
                .statusCode(200)
                .body("registrationId", equalTo(REG_ID.toString()));
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void getById_returns404WhenNotFound() {
        when(registrationService.getById(eq(REG_ID), eq(STUDENT)))
                .thenThrow(new WebApplicationException(Response.Status.NOT_FOUND));

        given()
                .when()
                .get("/api/registrations/" + REG_ID)
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void getById_returns403WhenNotOwner() {
        when(registrationService.getById(eq(REG_ID), eq(STUDENT)))
                .thenThrow(new WebApplicationException(Response.Status.FORBIDDEN));

        given()
                .when()
                .get("/api/registrations/" + REG_ID)
                .then()
                .statusCode(403);
    }

    // ─── DELETE /api/registrations/{id} ────────────────────────────────────────

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void delete_returns204WhenSuccess() {
        doNothing().when(registrationService).cancel(eq(REG_ID), eq(STUDENT));

        given()
                .when()
                .delete("/api/registrations/" + REG_ID)
                .then()
                .statusCode(anyOf(is(200), is(204)));
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_ORGANIZER))
    void delete_returns403WhenCallerIsNotStudent() {
        given()
                .when()
                .delete("/api/registrations/" + REG_ID)
                .then()
                .statusCode(403);

        verify(registrationService, never()).cancel(any(), any());
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void delete_returns409WhenEventPast() {
        doThrow(new WebApplicationException(Response.Status.CONFLICT))
                .when(registrationService).cancel(eq(REG_ID), eq(STUDENT));

        given()
                .when()
                .delete("/api/registrations/" + REG_ID)
                .then()
                .statusCode(409);
    }

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void delete_returns403WhenNotOwner() {
        doThrow(new WebApplicationException(Response.Status.FORBIDDEN))
                .when(registrationService).cancel(eq(REG_ID), eq(STUDENT));

        given()
                .when()
                .delete("/api/registrations/" + REG_ID)
                .then()
                .statusCode(403);
    }

    // ── PINFO-217: Bean Validation enforcement on POST body ─────────────────
    // The OpenAPI generator emits @Valid @NotNull on the
    // CreateRegistrationRequest parameter of RegistrationsApi#apiRegistrations
    // Post and the DTO carries @NotNull on `eventId`. Quarkus + Hibernate
    // Validator enforce this at the resource boundary; this test pins the
    // contract so a future spec change that drops `required: [eventId]` (or
    // a generator regression that strips @Valid) cannot silently land.

    @Test
    @TestSecurity(user = TEST_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = @Claim(key = "sub", value = TEST_STUDENT))
    void post_returns4xxWhenEventIdMissing() {
        given()
                .contentType(ContentType.JSON)
                .body("{}")
                .when()
                .post("/api/registrations")
                .then()
                .statusCode(anyOf(is(400), is(422)));

        verify(registrationService, never()).register(any(), any());
    }
}
