package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.EligibilityRule;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class InternalEventResourceTest {

    static final String VALID_KEY = "test-internal-key";
    static final String WRONG_KEY = "wrong-key";
    static final String UNKNOWN_EVENT_ID = "00000000-0000-0000-0000-000000000001";

    @Inject
    EventRepository eventRepository;

    @BeforeEach
    @Transactional
    void setUp() {
        eventRepository.deleteAll();
    }

    @Test
    void getInternalEventByIdReturns401WhenKeyIsMissing() {
        given()
                .when()
                .get("/internal/events/" + UNKNOWN_EVENT_ID)
                .then()
                .statusCode(401);
    }

    @Test
    void getInternalEventByIdReturns401WithWrongKey() {
        given()
                .header("X-Internal-Service-Key", WRONG_KEY)
                .when()
                .get("/internal/events/" + UNKNOWN_EVENT_ID)
                .then()
                .statusCode(401);
    }

    @Test
    void getInternalEventByIdReturns404ForUnknownEvent() {
        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + UNKNOWN_EVENT_ID)
                .then()
                .statusCode(404);
    }

    @Test
    void getInternalEventByIdReturns200WithCoreFields() {
        Event event = createEvent(UUID.randomUUID(), EventStatus.PUBLISHED, "Science Fair", null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId)
                .then()
                .statusCode(200)
                .body("eventId", equalTo(event.eventId.toString()))
                .body("title", equalTo("Science Fair"))
                .body("place", equalTo("Room 101"))
                .body("status", equalTo("PUBLISHED"))
                .body("organizerId", equalTo(event.organizerId.toString()))
                .body("capacity", equalTo(50))
                .body("registeredCount", equalTo(0))
                .body("createdAt", notNullValue())
                .body("updatedAt", notNullValue());
    }

    @Test
    void getInternalEventByIdIncludesEligibilityRule() {
        EligibilityRule rule = new EligibilityRule();
        rule.faculties = List.of("Sciences");
        rule.majors = List.of();
        rule.degreeLevels = List.of("BACHELOR", "MASTER");

        Event event = createEvent(UUID.randomUUID(), EventStatus.PUBLISHED, "Restricted Event", rule);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId)
                .then()
                .statusCode(200)
                .body("restrictedTo.faculties", hasItems("Sciences"))
                .body("restrictedTo.degreeLevels", hasItems("BACHELOR", "MASTER"));
    }

    @Test
    void getInternalEventByIdReturnsDraftEvent() {
        // Internal endpoint must expose DRAFT events (unlike the public API)
        Event event = createEvent(UUID.randomUUID(), EventStatus.DRAFT, "Draft Event", null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId)
                .then()
                .statusCode(200)
                .body("status", equalTo("DRAFT"));
    }

    @Test
    void getInternalEventByIdReturnsCancelledEvent() {
        Event event = createEvent(UUID.randomUUID(), EventStatus.CANCELLED, "Old Conference", null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId)
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELLED"));
    }

    @Test
    void getInternalEventByIdNullRestrictedToIsAbsent() {
        Event event = createEvent(UUID.randomUUID(), EventStatus.PUBLISHED, "Open Event", null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId)
                .then()
                .statusCode(200)
                .body("restrictedTo", nullValue());
    }

    @Test
    void getCapacityReturns401WhenKeyIsMissing() {
        given()
                .when()
                .get("/internal/events/" + UNKNOWN_EVENT_ID + "/capacity")
                .then()
                .statusCode(401);
    }

    @Test
    void getCapacityReturns401WithWrongKey() {
        given()
                .header("X-Internal-Service-Key", WRONG_KEY)
                .when()
                .get("/internal/events/" + UNKNOWN_EVENT_ID + "/capacity")
                .then()
                .statusCode(401);
    }

    @Test
    void getCapacityReturns404ForUnknownEvent() {
        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + UNKNOWN_EVENT_ID + "/capacity")
                .then()
                .statusCode(404);
    }

    @Test
    void getCapacityForLimitedEventHasCorrectSlots() {
        Event event = createEvent(UUID.randomUUID(), EventStatus.PUBLISHED, "Workshop", null);
        // capacity was set to 50 in createEvent()

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId + "/capacity")
                .then()
                .statusCode(200)
                .body("eventId", equalTo(event.eventId.toString()))
                .body("capacity", equalTo(50))
                .body("registeredCount", equalTo(0))
                .body("availableSlots", equalTo(50))
                .body("isFull", equalTo(false));
    }

    @Test
    void getCapacityForUnlimitedEventHasNullSlots() {
        Event event = createEventUnlimited(UUID.randomUUID(), EventStatus.PUBLISHED, "Open Lecture");

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId + "/capacity")
                .then()
                .statusCode(200)
                .body("eventId", equalTo(event.eventId.toString()))
                .body("capacity", nullValue())
                .body("registeredCount", equalTo(0))
                .body("availableSlots", nullValue())
                .body("isFull", equalTo(false));
    }

    @Test
    void getCapacityEventIdMatchesRequestedId() {
        Event event = createEvent(UUID.randomUUID(), EventStatus.PUBLISHED, "Seminar", null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when()
                .get("/internal/events/" + event.eventId + "/capacity")
                .then()
                .statusCode(200)
                .body("eventId", equalTo(event.eventId.toString()));
    }

    // ******** Helpers ********

    @Transactional
    Event createEvent(UUID organizerId, EventStatus status, String title, EligibilityRule restrictedTo) {
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = status;
        event.title = title;
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        event.capacity = 50;
        event.restrictedTo = restrictedTo;
        eventRepository.persist(event);
        return event;
    }

    @Transactional
    Event createEventUnlimited(UUID organizerId, EventStatus status, String title) {
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = status;
        event.title = title;
        event.place = "Auditorium";
        event.time = OffsetDateTime.now().plusDays(1);
        event.capacity = null;
        eventRepository.persist(event);
        return event;
    }
}
