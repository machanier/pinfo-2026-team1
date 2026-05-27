package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.model.EventRegistrationCount;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRegistrationCountRepository;
import ch.unige.pinfo.event.repository.EventRepository;
import ch.unige.pinfo.event.util.TestJwtHelper;
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
import java.util.Set;
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

        @Inject
        EventRegistrationCountRepository registrationCountRepository;

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
                UUID organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
                UUID otherOrganizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_OTHER_ORGANIZER);

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
                UUID organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
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
                UUID organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
                UUID otherOrganizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_OTHER_ORGANIZER);

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

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void listEventsOrganizerNoFilters_seesOwnEventsAllStatuses() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                UUID otherOrganizerId = organizerIdFromSubject(AUTH0_OTHER_ORGANIZER);

                persistEvent(organizerId, EventStatus.DRAFT, "My Draft");
                persistEvent(organizerId, EventStatus.PUBLISHED, "My Published");
                persistEvent(otherOrganizerId, EventStatus.PUBLISHED, "Other Published");
                persistEvent(otherOrganizerId, EventStatus.DRAFT, "Other Draft");

                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                // No filters: should auto-scope to own organizerId, return all statuses
                given()
                                .when()
                                .get("/api/events")
                                .then()
                                .statusCode(200)
                                .body("content.size()", equalTo(2))
                                .body("content.organizerId", everyItem(equalTo(organizerId.toString())));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void listEventsOrganizerExplicitPublishedStatus_seesAllPublished() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                UUID otherOrganizerId = organizerIdFromSubject(AUTH0_OTHER_ORGANIZER);

                persistEvent(organizerId, EventStatus.DRAFT, "My Draft");
                persistEvent(organizerId, EventStatus.PUBLISHED, "My Published");
                persistEvent(otherOrganizerId, EventStatus.PUBLISHED, "Other Published");

                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                // Explicit PUBLISHED: no organizerId restriction applied
                given()
                                .queryParam("status", "PUBLISHED")
                                .when()
                                .get("/api/events")
                                .then()
                                .statusCode(200)
                                .body("content.size()", equalTo(2))
                                .body("content.status", everyItem(equalTo("PUBLISHED")));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void listEventsOrganizerNullStatusOtherOrganizerId_seesPublishedOnly() {
                UUID otherOrganizerId = organizerIdFromSubject(AUTH0_OTHER_ORGANIZER);

                persistEvent(otherOrganizerId, EventStatus.DRAFT, "Other Draft");
                persistEvent(otherOrganizerId, EventStatus.PUBLISHED, "Other Published");

                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                // No status filter + other organizer's ID: must restrict to PUBLISHED
                given()
                                .queryParam("organizerId", otherOrganizerId)
                                .when()
                                .get("/api/events")
                                .then()
                                .statusCode(200)
                                .body("content.size()", equalTo(1))
                                .body("content.status", everyItem(equalTo("PUBLISHED")));
        }

        @Test
        @TestSecurity(user = "admin", roles = "ADMIN")
        void listEventsAdminSeesEverything() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                UUID otherOrganizerId = organizerIdFromSubject(AUTH0_OTHER_ORGANIZER);

                persistEvent(organizerId, EventStatus.DRAFT, "Draft A");
                persistEvent(organizerId, EventStatus.PUBLISHED, "Published A");
                persistEvent(otherOrganizerId, EventStatus.CANCELLED, "Cancelled B");

                when(jwt.getGroups()).thenReturn(Set.of("ADMIN"));

                // ADMIN: no filtering at all
                given()
                                .when()
                                .get("/api/events")
                                .then()
                                .statusCode(200)
                                .body("content.size()", equalTo(3));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void updateEventSuccessfully() {
                String eventId = given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Original Title",
                                                    "place": "Room A",
                                                    "time": "2026-06-01T10:00:00Z"
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
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Updated Title",
                                                    "place": "Room B",
                                                    "capacity": 50
                                                }
                                                """)
                                .when()
                                .put("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("title", equalTo("Updated Title"))
                                .body("place", equalTo("Room B"))
                                .body("capacity", equalTo(50));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void deleteEventSuccessfully() {
                String eventId = given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "To Delete",
                                                    "place": "Room X",
                                                    "time": "2026-06-01T10:00:00Z"
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
                                .delete("/api/events/{eventId}")
                                .then()
                                .statusCode(204);

                given()
                                .pathParam("eventId", eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(404);
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void deleteNonExistentEvent_returns404() {
                given()
                                .pathParam("eventId", "99999999-9999-9999-9999-999999999999")
                                .when()
                                .delete("/api/events/{eventId}")
                                .then()
                                .statusCode(404);
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void deletePublishedEvent_returns409() {
                String eventId = given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Published Event",
                                                    "place": "Room P",
                                                    "time": "2026-06-01T10:00:00Z"
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
                                .when()
                                .delete("/api/events/{eventId}")
                                .then()
                                .statusCode(409);
        }

        @Test
        @TestSecurity(user = "admin", roles = "ADMIN")
        void adminCanDeleteAnotherOrganizersEvent() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(organizerId, EventStatus.DRAFT, "Organizer Draft");

                // Admin has a different identity than the event owner
                when(jwt.getSubject()).thenReturn("auth0|admin-user");
                when(jwt.getGroups()).thenReturn(Set.of("ADMIN"));

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .delete("/api/events/{eventId}")
                                .then()
                                .statusCode(204);
        }

        // ── PINFO-217: Bean Validation enforcement on POST/PUT bodies ────────
        // The OpenAPI generator emits @Valid @NotNull on the request-body
        // parameters of every generated *Api interface (CreateEventRequest,
        // UpdateEventRequest, CreateAnnouncementRequest, etc.) and the DTO
        // getters carry the per-field constraints declared in the spec
        // (`@NotNull` for `required: [title, place, time]`, `@Min(1)` for
        // capacity). Quarkus + Hibernate Validator enforce these at the
        // resource boundary, so adding @Valid in the implementation methods
        // would actually fail with HV000151 (constraint redefinition on
        // override). The tests below pin that contract: they exercise the
        // three required fields plus the capacity bound and confirm the
        // server short-circuits with a 4xx instead of accepting the row.

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void createEvent_returns4xxWhenTitleMissing() {
                given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "place": "Room A",
                                                    "time": "2026-04-20T10:00:00Z"
                                                }
                                                """)
                                .when()
                                .post("/api/events")
                                .then()
                                .statusCode(anyOf(is(400), is(422)));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void createEvent_returns4xxWhenPlaceMissing() {
                given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Tournoi",
                                                    "time": "2026-04-20T10:00:00Z"
                                                }
                                                """)
                                .when()
                                .post("/api/events")
                                .then()
                                .statusCode(anyOf(is(400), is(422)));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void createEvent_returns4xxWhenTimeMissing() {
                given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Tournoi",
                                                    "place": "Room A"
                                                }
                                                """)
                                .when()
                                .post("/api/events")
                                .then()
                                .statusCode(anyOf(is(400), is(422)));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void createEvent_returns4xxWhenCapacityIsZero() {
                given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Tournoi",
                                                    "place": "Room A",
                                                    "time": "2026-04-20T10:00:00Z",
                                                    "capacity": 0
                                                }
                                                """)
                                .when()
                                .post("/api/events")
                                .then()
                                .statusCode(anyOf(is(400), is(422)));
        }

        // Banner image URL tests

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void updateEvent_setValidBannerImageUrl_returns200WithBannerUrl() {
                String eventId = given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Banner Test",
                                                    "place": "Hall B",
                                                    "time": "2026-07-01T10:00:00Z"
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
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "bannerImageUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg"
                                                }
                                                """)
                                .when()
                                .put("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("bannerImageUrl",
                                                equalTo("https://res.cloudinary.com/demo/image/upload/sample.jpg"));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void updateEvent_emptyBannerImageUrl_clearsBanner() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(organizerId, EventStatus.DRAFT, "Banner Clear Test");
                event.bannerImageUrl = "https://res.cloudinary.com/demo/image/upload/old.jpg";
                // persisted via persistEvent; update the banner via the API
                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                given()
                                .pathParam("eventId", event.eventId)
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "bannerImageUrl": ""
                                                }
                                                """)
                                .when()
                                .put("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("bannerImageUrl", nullValue());
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void updateEvent_nonCloudinaryBannerImageUrl_returns400() {
                String eventId = given()
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "Banner Reject Test",
                                                    "place": "Hall C",
                                                    "time": "2026-07-01T10:00:00Z"
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
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "bannerImageUrl": "https://evil.example.com/malicious.jpg"
                                                }
                                                """)
                                .when()
                                .put("/api/events/{eventId}")
                                .then()
                                .statusCode(400);
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void updateEvent_omitBannerImageUrl_leavesExistingBannerUnchanged() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEventWithBanner(organizerId,
                                "https://res.cloudinary.com/demo/image/upload/existing.jpg");
                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                given()
                                .pathParam("eventId", event.eventId)
                                .contentType(ContentType.JSON)
                                .body("""
                                                {
                                                    "title": "New Title Only"
                                                }
                                                """)
                                .when()
                                .put("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("bannerImageUrl",
                                                equalTo("https://res.cloudinary.com/demo/image/upload/existing.jpg"));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void deleteBanner_returns204AndClearsBannerUrl() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEventWithBanner(organizerId,
                                "https://res.cloudinary.com/demo/image/upload/banner.jpg");
                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .delete("/api/events/{eventId}/banner")
                                .then()
                                .statusCode(204);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("bannerImageUrl", nullValue());
        }

        @Test
        @TestSecurity(user = AUTH0_OTHER_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_OTHER_ORGANIZER))
        void deleteBanner_byNonOwner_returns403() {
                UUID ownerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEventWithBanner(ownerId,
                                "https://res.cloudinary.com/demo/image/upload/banner.jpg");
                when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .delete("/api/events/{eventId}/banner")
                                .then()
                                .statusCode(403);
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = @Claim(key = "sub", value = AUTH0_ORGANIZER))
        void deleteBanner_nonExistentEvent_returns404() {
                given()
                                .pathParam("eventId", "99999999-9999-9999-9999-999999999999")
                                .when()
                                .delete("/api/events/{eventId}/banner")
                                .then()
                                .statusCode(404);
        }

        // ── Event detail visibility: unauthenticated and non-owner access ──────────

        @Test
        void getEventById_anonymous_draftReturns404() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(organizerId, EventStatus.DRAFT, "Draft Hidden");
                when(jwt.getSubject()).thenReturn(null);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(404);
        }

        @Test
        void getEventById_anonymous_cancelledReturns404() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(organizerId, EventStatus.CANCELLED, "Cancelled Hidden");
                when(jwt.getSubject()).thenReturn(null);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(404);
        }

        @Test
        void getEventById_anonymous_publishedReturns200() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(organizerId, EventStatus.PUBLISHED, "Public Event");
                when(jwt.getSubject()).thenReturn(null);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("status", equalTo("PUBLISHED"));
        }

        @Test
        @TestSecurity(user = AUTH0_OTHER_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OTHER_ORGANIZER)
        })
        void getEventById_nonOwner_draftReturns404() {
                UUID ownerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(ownerId, EventStatus.DRAFT, "Draft by Another");
                when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(404);
        }

        @Test
        @TestSecurity(user = "admin", roles = "ADMIN")
        void getEventById_admin_canSeeDraft() {
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(organizerId, EventStatus.DRAFT, "Admin Visible Draft");
                when(jwt.getSubject()).thenReturn("auth0|admin-user");
                when(jwt.getGroups()).thenReturn(Set.of("ADMIN"));

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("status", equalTo("DRAFT"));
        }

        @Test
        void getEventById_returnsRealRegisteredCount() {
                // Regression guard for PR #151: registeredCount must reflect the
                // real value from the projection table, not the hardcoded 0 it used
                // to return. A published event with 5 registrations must report 5.
                UUID organizerId = organizerIdFromSubject(AUTH0_ORGANIZER);
                Event event = persistEvent(organizerId, EventStatus.PUBLISHED, "Event With Registrations");
                persistRegisteredCount(event.eventId, 5);
                when(jwt.getSubject()).thenReturn(null);

                given()
                                .pathParam("eventId", event.eventId)
                                .when()
                                .get("/api/events/{eventId}")
                                .then()
                                .statusCode(200)
                                .body("registeredCount", equalTo(5));
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

        @Transactional
        Event persistEventWithBanner(UUID organizerId, String bannerImageUrl) {
                Event event = persistEvent(organizerId, EventStatus.DRAFT, "Banner Event");
                event.bannerImageUrl = bannerImageUrl;
                eventRepository.persist(event);
                return event;
        }

        @Transactional
        void persistRegisteredCount(UUID eventId, int count) {
                EventRegistrationCount c = new EventRegistrationCount();
                c.eventId = eventId;
                c.registeredCount = count;
                registrationCountRepository.persist(c);
        }
}
