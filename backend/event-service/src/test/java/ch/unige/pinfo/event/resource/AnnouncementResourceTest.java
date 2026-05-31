package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.openapi.model.AnnouncementStatus;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
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
import java.time.OffsetDateTime;
import java.util.UUID;
import ch.unige.pinfo.event.model.Announcement;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

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
        event.organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
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
                .body("status", equalTo("PENDING_MODERATION"))
                .body("postedAt", nullValue());
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

    @Test
    void listAnnouncementsWithoutAuthSucceeds() {
        // GET announcements should be public (no auth required per spec)
        given()
                .pathParam("eventId", eventId)
                .when()
                .get("/api/events/{eventId}/announcements")
                .then()
                .statusCode(200)
                .body("content", empty())
                .body("page", equalTo(0))
                .body("size", equalTo(20));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void listAnnouncementsSuccessfully() {
        // Create some announcements first
        postAnnouncement("First announcement");
        postAnnouncement("Second announcement");
        postAnnouncement("Third announcement");

        given()
                .pathParam("eventId", eventId)
                .when()
                .get("/api/events/{eventId}/announcements")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(3))
                .body("totalElements", equalTo(3))
                .body("totalPages", equalTo(1))
                .body("page", equalTo(0))
                .body("size", equalTo(20))
                .body("content[0].body", notNullValue())
                .body("content[0].announcementId", notNullValue());
    }

    @Test
    void listAnnouncementsForNonExistentEventReturns404() {
        given()
                .pathParam("eventId", "99999999-9999-9999-9999-999999999999")
                .when()
                .get("/api/events/{eventId}/announcements")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void listAnnouncementsWithCustomPageSize() {
        // Create 25 announcements
        for (int i = 0; i < 25; i++) {
            postAnnouncement("Announcement " + i);
        }

        // Request page 0 with size 10
        given()
                .pathParam("eventId", eventId)
                .queryParam("page", 0)
                .queryParam("size", 10)
                .when()
                .get("/api/events/{eventId}/announcements")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(10))
                .body("totalElements", equalTo(25))
                .body("totalPages", equalTo(3))
                .body("page", equalTo(0))
                .body("size", equalTo(10));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void listAnnouncementsWithPagination() {
        // Create 25 announcements
        for (int i = 0; i < 25; i++) {
            postAnnouncement("Announcement " + i);
        }

        // Request page 2 with size 10
        given()
                .pathParam("eventId", eventId)
                .queryParam("page", 2)
                .queryParam("size", 10)
                .when()
                .get("/api/events/{eventId}/announcements")
                .then()
                .statusCode(200)
                .body("content.size()", equalTo(5))
                .body("totalElements", equalTo(25))
                .body("totalPages", equalTo(3))
                .body("page", equalTo(2))
                .body("size", equalTo(10));
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void listAnnouncementsOrderedByMostRecentFirst() {
        String ann1Id = postAnnouncement("First announcement");
        String ann2Id = postAnnouncement("Second announcement");
        String ann3Id = postAnnouncement("Third announcement");

        given()
                .pathParam("eventId", eventId)
                .when()
                .get("/api/events/{eventId}/announcements")
                .then()
                .statusCode(200)
                .body("content[0].announcementId", equalTo(ann3Id))
                .body("content[1].announcementId", equalTo(ann2Id))
                .body("content[2].announcementId", equalTo(ann1Id));
    }

    @Test
    void getAnnouncementWithoutAuthSucceeds() {
        String announcementId = postAnnouncement("Test announcement");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(200)
                .body("announcementId", equalTo(announcementId))
                .body("eventId", equalTo(eventId))
                .body("body", equalTo("Test announcement"))
                .body("postedAt", notNullValue());
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void getAnnouncementSuccessfully() {
        String announcementId = postAnnouncement("Detailed announcement");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(200)
                .body("announcementId", equalTo(announcementId))
                .body("eventId", equalTo(eventId))
                .body("organizerId", notNullValue())
                .body("body", equalTo("Detailed announcement"))
                .body("postedAt", notNullValue());
    }

    @Test
    void getAnnouncementForNonExistentEventReturns404() {
        given()
                .pathParam("eventId", "99999999-9999-9999-9999-999999999999")
                .pathParam("announcementId", "99999999-9999-9999-9999-999999999999")
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);
    }

    @Test
    void getNonExistentAnnouncementReturns404() {
        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", "99999999-9999-9999-9999-999999999999")
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    @Transactional
    void getAnnouncementFromDifferentEventReturns404() {
        // Create another event
        Event otherEvent = new Event();
        otherEvent.organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
        otherEvent.status = EventStatus.PUBLISHED;
        otherEvent.title = "Other Event";
        otherEvent.place = "Room 202";
        otherEvent.time = OffsetDateTime.now().plusDays(2);
        eventRepository.persist(otherEvent);

        // Create announcement for the other event
        String announcementId = postAnnouncementForEvent(otherEvent.eventId.toString(), "Other event announcement");

        // Try to retrieve it from the first event (should fail)
        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);
    }

    @Test
    void deleteAnnouncementWithoutAuth() {
        String announcementId = postAnnouncement("Test announcement");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteAnnouncementSuccessfully() {
        String announcementId = postAnnouncement("Announcement to delete");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(204);

        // Verify it's deleted by trying to retrieve it
        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteAnnouncementForNonExistentEventReturns404() {
        given()
                .pathParam("eventId", "99999999-9999-9999-9999-999999999999")
                .pathParam("announcementId", "99999999-9999-9999-9999-999999999999")
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteNonExistentAnnouncementReturns404() {
        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", "99999999-9999-9999-9999-999999999999")
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteAnnouncementAsNonOwnerOrganizerReturns403() {
        when(jwt.getSubject()).thenReturn(AUTH0_OTHER_ORGANIZER);

        String announcementId = postAnnouncement("Announcement");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(403);

        // Verify the announcement is still there
        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(200);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ADMIN")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteAnnouncementWithAdminRole() {
        String announcementId = postAnnouncement("Announcement to delete");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(204);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteAnnouncementWithMissingSubjectReturns401() {
        when(jwt.getSubject()).thenReturn(null);

        String announcementId = postAnnouncement("Test");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    @Transactional
    void deleteAnnouncementFromDifferentEventReturns404() {
        // Create another event
        Event otherEvent = new Event();
        otherEvent.organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
        otherEvent.status = EventStatus.PUBLISHED;
        otherEvent.title = "Other Event";
        otherEvent.place = "Room 202";
        otherEvent.time = OffsetDateTime.now().plusDays(2);
        eventRepository.persist(otherEvent);

        // Create announcement for the other event
        String announcementId = postAnnouncementForEvent(otherEvent.eventId.toString(), "Other event announcement");

        // Try to delete it from the first event (should fail)
        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ORGANIZER")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteMultipleAnnouncementsSuccessfully() {
        String ann1Id = postAnnouncement("First announcement");
        String ann2Id = postAnnouncement("Second announcement");
        String ann3Id = postAnnouncement("Third announcement");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", ann1Id)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(204);

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", ann3Id)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(204);

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", ann1Id)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", ann3Id)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(404);

        // Verify ann2 still exists
        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", ann2Id)
                .when()
                .get("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(200);
    }

    /**
     * Post an announcement and return its ID from the response
     */
    @Transactional
    String postAnnouncement(String body) {
        Announcement ann = new Announcement();
        ann.eventId = UUID.fromString(eventId);
        ann.organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
        ann.body = body;
        ann.status = AnnouncementStatus.PUBLISHED;
        ann.postedAt = OffsetDateTime.now();
        announcementRepository.persist(ann);
        return ann.announcementId.toString();
    }

    /**
     * Post an announcement for a specific event and return its ID
     */
    @Transactional
    String postAnnouncementForEvent(String targetEventId, String body) {
        Announcement ann = new Announcement();
        ann.eventId = UUID.fromString(targetEventId);
        ann.organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
        ann.body = body;
        ann.status = AnnouncementStatus.PUBLISHED;
        ann.postedAt = OffsetDateTime.now();
        announcementRepository.persist(ann);
        return ann.announcementId.toString();
    }

    @Test
    @TestSecurity(user = AUTH0_ORGANIZER, roles = "ADMIN")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = AUTH0_ORGANIZER)
    })
    void deleteAnnouncementAsAdminSucceeds() {
        String announcementId = postAnnouncement("Announcement to delete");

        given()
                .pathParam("eventId", eventId)
                .pathParam("announcementId", announcementId)
                .when()
                .delete("/api/events/{eventId}/announcements/{announcementId}")
                .then()
                .statusCode(204);
    }

    @Test
    void listAnnouncementsWithLargePageSize() {
        postAnnouncement("Announcement 1");

        given()
                .pathParam("eventId", eventId)
                .queryParam("page", 0)
                .queryParam("size", 2147483647) // Large page size
                .when()
                .get("/api/events/{eventId}/announcements")
                .then()
                .statusCode(200);
    }

}
