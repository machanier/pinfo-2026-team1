package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class CalendarResourceTest {

    @Inject
    EventRepository eventRepository;

    private UUID organizerId1;
    private UUID organizerId2;
    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    @Transactional
    void setUp() {
        eventRepository.deleteAll();
        organizerId1 = UUID.randomUUID();
        organizerId2 = UUID.randomUUID();
        startDate = LocalDate.of(2026, 5, 1);
        endDate = LocalDate.of(2026, 5, 31);
    }

    @Test
    void getCalendarEventsMissingFromDateReturns400() {
        given()
                .queryParam("to", endDate.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(400);
    }

    @Test
    void getCalendarEventsMissingToDateReturns400() {
        given()
                .queryParam("from", startDate.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(400);
    }

    @Test
    void getCalendarEventsMissingBothDatesReturns400() {
        given()
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(400);
    }

    @Test
    void getCalendarEventsStartDateAfterEndDateReturns400() {
        LocalDate invalidStart = LocalDate.of(2026, 5, 31);
        LocalDate invalidEnd = LocalDate.of(2026, 5, 1);

        given()
                .queryParam("from", invalidStart.toString())
                .queryParam("to", invalidEnd.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(400);
    }

    @Test
    void getCalendarEventsReturnsOnlyPublished() {
        OffsetDateTime eventTime = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Published Event", eventTime);
        persistEvent(organizerId1, EventStatus.DRAFT, "Draft Event", eventTime);
        persistEvent(organizerId1, EventStatus.CANCELLED, "Cancelled Event", eventTime);

        given()
                .queryParam("from", startDate.toString())
                .queryParam("to", endDate.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].status", equalTo("PUBLISHED"))
                .body("[0].title", equalTo("Published Event"));
    }

    @Test
    void getCalendarEventsOnlyWithinDateRange() {
        OffsetDateTime withinRange = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        OffsetDateTime beforeRange = LocalDate.of(2026, 4, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        OffsetDateTime afterRange = LocalDate.of(2026, 6, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Within Range", withinRange);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "Before Range", beforeRange);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "After Range", afterRange);

        given()
                .queryParam("from", startDate.toString())
                .queryParam("to", endDate.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].title", equalTo("Within Range"));
    }

    @Test
    void getCalendarEventsIncludeBoundaryDates() {
        OffsetDateTime startTime = startDate.atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        OffsetDateTime endTime = endDate.atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Start Date Event", startTime);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "End Date Event", endTime);

        given()
                .queryParam("from", startDate.toString())
                .queryParam("to", endDate.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(200)
                .body("size()", equalTo(2));
    }

    @Test
    void getCalendarEventsFilterByOrganizer() {
        OffsetDateTime eventTime = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Event A", eventTime);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "Event B", eventTime);
        persistEvent(organizerId2, EventStatus.PUBLISHED, "Event C", eventTime);

        given()
                .queryParam("from", startDate.toString())
                .queryParam("to", endDate.toString())
                .queryParam("organizerId", organizerId1)
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(200)
                .body("size()", equalTo(2))
                .body("[0].title", equalTo("Event A"))
                .body("[1].title", equalTo("Event B"));
    }

    @Test
    void getCalendarEventsReturnsLightweightData() {
        OffsetDateTime eventTime = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Test Event", eventTime);

        given()
                .queryParam("from", startDate.toString())
                .queryParam("to", endDate.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(200)
                .body("[0].eventId", notNullValue())
                .body("[0].title", equalTo("Test Event"))
                .body("[0].place", equalTo("Room 101"))
                .body("[0].time", notNullValue())
                .body("[0].status", equalTo("PUBLISHED"))
                .body("[0].category", nullValue());
    }

    @Test
    void getCalendarEventsEmptyResult() {
        given()
                .queryParam("from", startDate.toString())
                .queryParam("to", endDate.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(200)
                .body("size()", equalTo(0));
    }

    @Test
    void getCalendarEventsSingleDayRange() {
        LocalDate singleDay = LocalDate.of(2026, 5, 15);

        given()
                .queryParam("from", singleDay.toString())
                .queryParam("to", singleDay.toString())
                .when()
                .get("/api/events/calendar")
                .then()
                .statusCode(200)
                .body("size()", equalTo(0));
    }

    @Transactional
    Event persistEvent(UUID organizerId, EventStatus status, String title, OffsetDateTime time) {
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = status;
        event.title = title;
        event.place = "Room 101";
        event.time = time;
        eventRepository.persist(event);
        return event;
    }
}
