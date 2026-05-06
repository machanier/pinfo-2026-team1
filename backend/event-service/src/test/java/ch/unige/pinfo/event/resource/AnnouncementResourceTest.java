package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
class AnnouncementResourceTest {

    @InjectMock
    JsonWebToken jwt;

    @Inject
    EventRepository eventRepository;

    @Inject
    AnnouncementRepository announcementRepository;

    private static final String AUTH0_ORGANIZER = "auth0|organizer-123";
    private static final String AUTH0_OTHER_ORGANIZER = "auth0|organizer-456";

    private String eventId;

    @BeforeEach
    @Transactional
    void setUp() {
        // Reset mocks before each test
        reset(jwt);
        when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

        // Clear repositories
        announcementRepository.deleteAll();
        eventRepository.deleteAll();

        // Create a published event owned by AUTH0_ORGANIZER
        Event event = new Event();
        event.organizerId = deriveOrganizerIdFromAuth0(AUTH0_ORGANIZER);
        event.status = EventStatus.PUBLISHED;
        event.title = "Test Event";
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(event);
        eventId = event.eventId.toString();
    }

    @Test
    void postAnnouncementWithoutAuth() {
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": "Unauthorized announcement"
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementSuccessfully() {
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": "Room changed"
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(201)
                .body("announcementId", notNullValue())
                .body("eventId", equalTo(eventId))
                .body("organizerId", notNullValue())
                .body("body", equalTo("Room changed"))
                .body("postedAt", notNullValue());
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementWithExceededLengthBody() {
        String tooLongBody = "a".repeat(2001);
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                            "body": "%s"
                        }
                        """, tooLongBody))
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(400);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementWithEmptyBody() {
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": ""
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(400);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementWithBlankBody() {
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": "   "
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(400);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementWithoutBodyField() {
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(400);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementForNonExistentEvent() {
        given()
                .pathParam("eventId", "99999999-9999-9999-9999-999999999999")
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": "Announcement for non-existent event"
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementAsNonOwnerOrganizer() {
        when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": "Unauthorized announcement"
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ADMIN")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementWithAdminRole() {
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": "Admin announcement"
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(201)
                .body("body", equalTo("Admin announcement"));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void postAnnouncementWithMissingSubject() {
        when(jwt.getSubject()).thenReturn(null);

        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "body": "Test announcement"
                        }
                        """)
                .when()
                .post("/api/events/{eventId}/announcements")
                .then()
                .statusCode(401);
    }

    // ******** Helpers ********

    /**
     * Derive a deterministic UUID from Auth0 subject string, matching the logic
     * in AnnouncementResource.getOrganizerIdFromJwt()
     */
    private UUID deriveOrganizerIdFromAuth0(String auth0Subject) {
        try {
            return UUID.fromString(auth0Subject);
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(auth0Subject.getBytes(StandardCharsets.UTF_8));
        }
    }
}
