package ch.unige.pinfo.event.resource;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import io.restassured.http.ContentType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

@QuarkusTest
class EventStateTransitionTest {

        @InjectMock
        JsonWebToken jwt;

        private static final String AUTH0_ORGANIZER = "auth0|organizer-123";

        @BeforeEach
        void setUp() {
                reset(jwt);
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void createDraftEvent_ReturnsCreatedEventWithDraftStatus() {
                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

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
                                .body("status", equalTo("DRAFT"))
                                .body("eventId", notNullValue());
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void submitDraftEvent_TransitionsToPendingModeration() {
                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                // Create a draft event first
                String eventId = given()
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
                                .extract()
                                .path("eventId");

                // Now publish it
                given()
                                .pathParam("eventId", eventId)
                                .when()
                                .patch("/api/events/{eventId}/submit")
                                .then()
                                .statusCode(200)
                                .body("status", equalTo("PENDING_MODERATION"));
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void deleteDraftEvent_Returns204() {
                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                // Create a draft event first
                String eventId = given()
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
                                .extract()
                                .path("eventId");

                // Delete it
                given()
                                .pathParam("eventId", eventId)
                                .when()
                                .delete("/api/events/{eventId}")
                                .then()
                                .statusCode(204);
        }

        @Test
        @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ORGANIZER)
        })
        void cannotSubmitAlreadySubmittedEvent_Returns409() {
                when(jwt.getSubject()).thenReturn(AUTH0_ORGANIZER);

                // Create and publish an event first
                String eventId = given()
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
                                .extract()
                                .path("eventId");

                given()
                                .pathParam("eventId", eventId)
                                .when()
                                .patch("/api/events/{eventId}/submit")
                                .then()
                                .statusCode(200);

                // Try to publish again - should fail
                given()
                                .pathParam("eventId", eventId)
                                .when()
                                .patch("/api/events/{eventId}/submit")
                                .then()
                                .statusCode(409);
        }

}
