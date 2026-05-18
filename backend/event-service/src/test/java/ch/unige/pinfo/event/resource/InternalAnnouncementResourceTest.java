package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.AnnouncementStatus;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
import ch.unige.pinfo.event.repository.EventRepository;
import ch.unige.pinfo.event.util.TestJwtHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class InternalAnnouncementResourceTest {

    @Inject
    EventRepository eventRepository;

    @Inject
    AnnouncementRepository announcementRepository;

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    private static final String AUTH0_ORGANIZER = "auth0|organizer-123";

    private String eventId;
    private String draftAnnouncementId;
    private String publishedAnnouncementId;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clear repositories
        announcementRepository.deleteAll();
        eventRepository.deleteAll();

        // Create a published event
        Event event = new Event();
        event.organizerId = TestJwtHelper.getOrganizerIdFromAuth0(AUTH0_ORGANIZER);
        event.status = EventStatus.PUBLISHED;
        event.title = "Test Event";
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(event);
        eventId = event.eventId.toString();

        // Create a draft announcement
        Announcement draftAnn = new Announcement();
        draftAnn.eventId = event.eventId;
        draftAnn.organizerId = event.organizerId;
        draftAnn.body = "Announcement for review";
        draftAnn.status = AnnouncementStatus.DRAFT;
        draftAnn.postedAt = null;
        announcementRepository.persist(draftAnn);
        draftAnnouncementId = draftAnn.announcementId.toString();

        // Create a published announcement
        Announcement publishedAnn = new Announcement();
        publishedAnn.eventId = event.eventId;
        publishedAnn.organizerId = event.organizerId;
        publishedAnn.body = "Already published announcement";
        publishedAnn.status = AnnouncementStatus.PUBLISHED;
        publishedAnn.postedAt = OffsetDateTime.now();
        announcementRepository.persist(publishedAnn);
        publishedAnnouncementId = publishedAnn.announcementId.toString();
    }

    @Test
    void publishAnnouncementWithoutInternalKeyReturns401() {
        given()
                .pathParam("announcementId", draftAnnouncementId)
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(401);
    }

    @Test
    void publishAnnouncementWithInvalidInternalKeyReturns401() {
        given()
                .pathParam("announcementId", draftAnnouncementId)
                .header("X-Internal-Service-Key", "wrong-key")
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(401);
    }

    @Test
    @Transactional
    void publishAnnouncementWithValidKeySucceeds() {
        given()
                .pathParam("announcementId", draftAnnouncementId)
                .header("X-Internal-Service-Key", internalServiceKey)
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(200)
                .body("announcementId", equalTo(draftAnnouncementId))
                .body("status", equalTo("PUBLISHED"))
                .body("postedAt", notNullValue());

        // Verify in database
        Announcement updated = announcementRepository.findById(UUID.fromString(draftAnnouncementId));
        assertEquals(AnnouncementStatus.PUBLISHED, updated.status);
        assertNotNull(updated.postedAt);
    }

    @Test
    void publishNonExistentAnnouncementReturns404() {
        given()
                .pathParam("announcementId", "99999999-9999-9999-9999-999999999999")
                .header("X-Internal-Service-Key", internalServiceKey)
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(404);
    }

    @Test
    void publishAlreadyPublishedAnnouncementReturns409() {
        given()
                .pathParam("announcementId", publishedAnnouncementId)
                .header("X-Internal-Service-Key", internalServiceKey)
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(409);
    }

    @Test
    @Transactional
    void publishAnnouncementReturnsCompleteAnnouncementResponse() {
        given()
                .pathParam("announcementId", draftAnnouncementId)
                .header("X-Internal-Service-Key", internalServiceKey)
                .contentType(ContentType.JSON)
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(200)
                .body("announcementId", notNullValue())
                .body("eventId", notNullValue())
                .body("organizerId", notNullValue())
                .body("body", equalTo("Announcement for review"))
                .body("status", equalTo("PUBLISHED"))
                .body("postedAt", notNullValue());
    }

    @Test
    void publishAnnouncementWithEmptyKeyHeaderReturns401() {
        given()
                .pathParam("announcementId", draftAnnouncementId)
                .header("X-Internal-Service-Key", "")
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(401);
    }

    @Test
    @Transactional
    void publishAnnouncementPreservesEventAndOrganizerIds() {
        given()
                .pathParam("announcementId", draftAnnouncementId)
                .header("X-Internal-Service-Key", internalServiceKey)
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(200)
                .body("eventId", equalTo(eventId));

        Announcement updated = announcementRepository.findById(UUID.fromString(draftAnnouncementId));
        assertEquals(eventId, updated.eventId.toString());
    }

    @Test
    void publishAnnouncementWithInvalidUuidFormatReturns404() {
        given()
                .pathParam("announcementId", "not-a-uuid")
                .header("X-Internal-Service-Key", internalServiceKey)
                .when()
                .patch("/internal/announcements/{announcementId}/publish")
                .then()
                .statusCode(404);
    }
}
