package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
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
class EventResourceTest {

    @InjectMock
    JsonWebToken jwt;

    @Inject
    EventRepository eventRepository;

    private static final String AUTH0_ORGANIZER = "auth0|organizer-123";
    private static final String AUTH0_OTHER_ORGANIZER = "auth0|organizer-456";

    @BeforeEach
    @Transactional
    void setUp() {
        // Reset mocks before each test
        reset(jwt);
        // Set default identity. Overridden per-test only when needed
        when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);
        eventRepository.deleteAll();
    }

    @Test
    void getEvents() {
        // GET events endpoint should work without auth
        given()
                .when()
                .get("/api/events")
                .then()
                .statusCode(200);
    }

    @Test
    void createEventWithoutAuth() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Unauthorized Event",
                            "place": "Room A",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void createEventWithAuth() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Test Event",
                            "place": "Room 101",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .body("title", equalTo("Test Event"))
                .body("organizerId", notNullValue())
                .body("status", equalTo("DRAFT"));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void createEventWithEligibilityRestrictions() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Test Event",
                            "place": "Room 101",
                            "time": "2026-04-20T10:00:00Z",
                            "restrictedTo": {
                                "faculties": ["Sciences"],
                                "majors": [],
                                "degreeLevels": ["BACHELOR"]
                                }
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .body("title", equalTo("Test Event"))
                .body("organizerId", notNullValue())
                .body("status", equalTo("DRAFT"))
                .body("restrictedTo.faculties", hasItems("Sciences"))
                .body("restrictedTo.majors", empty())
                .body("restrictedTo.degreeLevels", hasItems("BACHELOR"));
    }

    @Test
    @TestSecurity(user = "anonymous", roles = "ORGANIZER")
    @JwtSecurity(claims = {})
    void createEventWithMissingSubject() {
        when(jwt.getSubject()).thenReturn(null);

        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Test Event",
                            "place": "Room 101",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void publishNonExistentEventWithAuth() {
        given()
                .when()
                .patch("/api/events/99999999-9999-9999-9999-999999999999/publish")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void updateNonExistentEventWithAuth() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Updated"
                        }
                        """)
                .when()
                .put("/api/events/99999999-9999-9999-9999-999999999999")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void updateEventNotOwnedByOrganizer() {
        when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Owned Event",
                            "place": "Room 202",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Hijacked Title"
                        }
                        """)
                .when()
                .put("/api/events/{eventId}")
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteEventNotOwnedByOrganizer() {
        when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Owned Event",
                            "place": "Room 202",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

        given()
                .pathParam("eventId", eventId)
                .when()
                .delete("/api/events/{eventId}")
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void publishEventNotOwnedByOrganizer() {
        when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Owned Event",
                            "place": "Room 202",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

        given()
                .pathParam("eventId", eventId)
                .when()
                .patch("/api/events/{eventId}/publish")
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void cancelEventNotOwnedByOrganizer() {
        when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Owned Event",
                            "place": "Room 202",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "reason": "Not owner"
                        }
                        """)
                .when()
                .patch("/api/events/{eventId}/cancel")
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void cancelEventSuccessfully() {
        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Cancellable Event",
                            "place": "Room 303",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        given()
                .pathParam("eventId", eventId)
                .when()
                .patch("/api/events/{eventId}/publish")
                .then()
                .statusCode(200);
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "reason": "Organizer cancelled"
                        }
                        """)
                .when()
                .patch("/api/events/{eventId}/cancel")
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELLED"));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void cancelNonExistentEvent() {
        given()
                .pathParam("eventId", "99999999-9999-9999-9999-999999999999")
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "reason": "Not found"
                        }
                        """)
                .when()
                .patch("/api/events/{eventId}/cancel")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void cancelEventInInvalidState() {
        // Create event (in DRAFT state)
        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Event in Draft",
                            "place": "Room 404",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        // Try to cancel without publishing
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "reason": "Invalid state"
                        }
                        """)
                .when()
                .patch("/api/events/{eventId}/cancel")
                .then()
                .statusCode(409);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void getEventWithRestrictions() {
        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Restricted Event",
                            "place": "Room 505",
                            "time": "2026-04-20T10:00:00Z",
                            "restrictedTo": {
                                "faculties": ["Engineering"],
                                "majors": ["Computer Science"],
                                "degreeLevels": ["BACHELOR", "MASTER"]
                            }
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        given()
                .pathParam("eventId", eventId)
                .when()
                .get("/api/events/{eventId}")
                .then()
                .statusCode(200)
                .body("restrictedTo.faculties", hasItems("Engineering"))
                .body("restrictedTo.majors", hasItems("Computer Science"))
                .body("restrictedTo.degreeLevels", hasItems("BACHELOR", "MASTER"));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void getEventWithId() {
        String eventId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                            "title": "Test Event",
                            "place": "Room 1",
                            "time": "2026-04-20T10:00:00Z"
                        }
                        """)
                .when()
                .post("/api/events")
                .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        given()
                .pathParam("eventId", eventId)
                .when()
                .get("/api/events/{eventId}")
                .then()
                .statusCode(200)
                .body("title", equalTo("Test Event"))
                .body("place", equalTo("Room 1"))
                .body("time", equalTo("2026-04-20T10:00:00Z"))
                .body("organizerId", notNullValue())
                .body("status", equalTo("DRAFT"));

    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void getNonExistentEvent() {
        String eventId = "000000";
        given()
                .pathParam("eventId", eventId)
                .when()
                .get("/api/events/{eventId}")
                .then()
                .statusCode(404);

    }

    @Test
    void listEventsUnauthenticatedOnlyShowsPublished() {
        UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
        UUID otherOrganizerId = organizerIdFromSubject(AUTH0_OTHER_ORGANIZER);

        persistEvent(organizerId, EventStatus.DRAFT, "Draft A");
        persistEvent(organizerId, EventStatus.CANCELLED, "Cancelled A");
        persistEvent(organizerId, EventStatus.PUBLISHED, "Published A");
        persistEvent(otherOrganizerId, EventStatus.PUBLISHED, "Published B");

        when(jwt.getSubject()).thenReturn(null);

        given()
                .queryParam("status", "DRAFT")
                .when()
                .get("/api/events")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(2))
                .body("content.status", everyItem(equalTo("PUBLISHED")));

        given()
                .queryParam("organizerId", otherOrganizerId)
                .queryParam("status", "CANCELLED")
                .when()
                .get("/api/events")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(1))
                .body("content.status", everyItem(equalTo("PUBLISHED")))
                .body("content.organizerId", everyItem(equalTo(otherOrganizerId.toString())));
    }

    @Test
    @TestSecurity(user = "student", roles = "STUDENT")
    void listEventsStudentOnlyShowsPublished() {
        UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
        persistEvent(organizerId, EventStatus.DRAFT, "Draft A");
        persistEvent(organizerId, EventStatus.CANCELLED, "Cancelled A");
        persistEvent(organizerId, EventStatus.PUBLISHED, "Published A");

        when(jwt.getSubject()).thenReturn("auth0|student-001");

        given()
                .queryParam("organizerId", organizerId)
                .queryParam("status", "CANCELLED")
                .when()
                .get("/api/events")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(1))
                .body("content.status", everyItem(equalTo("PUBLISHED")))
                .body("content.organizerId", everyItem(equalTo(organizerId.toString())));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void listEventsOrganizerSeesOwnDraftsAndCancelledOnly() {
        UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
        UUID otherOrganizerId = organizerIdFromSubject(AUTH0_OTHER_ORGANIZER);

        persistEvent(organizerId, EventStatus.DRAFT, "Draft A");
        persistEvent(organizerId, EventStatus.CANCELLED, "Cancelled A");
        persistEvent(organizerId, EventStatus.PUBLISHED, "Published A");
        persistEvent(otherOrganizerId, EventStatus.DRAFT, "Draft B");
        persistEvent(otherOrganizerId, EventStatus.PUBLISHED, "Published B");

        when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

        given()
                .queryParam("organizerId", organizerId)
                .queryParam("status", "DRAFT")
                .when()
                .get("/api/events")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(1))
                .body("content[0].status", equalTo("DRAFT"))
                .body("content[0].organizerId", equalTo(organizerId.toString()));

        given()
                .queryParam("organizerId", organizerId)
                .queryParam("status", "CANCELLED")
                .when()
                .get("/api/events")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(1))
                .body("content[0].status", equalTo("CANCELLED"))
                .body("content[0].organizerId", equalTo(organizerId.toString()));

        given()
                .queryParam("organizerId", otherOrganizerId)
                .queryParam("status", "DRAFT")
                .when()
                .get("/api/events")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(1))
                .body("content.status", everyItem(equalTo("PUBLISHED")))
                .body("content.organizerId", everyItem(equalTo(otherOrganizerId.toString())));
    }

    private UUID organizerIdFromSubject(String subject) {
        return UUID.nameUUIDFromBytes(subject.getBytes(StandardCharsets.UTF_8));
    }

    @Transactional
    Event persistEvent(UUID organizerId, EventStatus status, String title) {
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = status;
        event.title = title;
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(event);
        return event;
    }
}
