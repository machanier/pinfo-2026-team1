package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.OffsetDateTime;
import java.util.stream.Stream;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class EventStateTransitionTest {

    private static final String EVENT_API = "/api/events";

    /**
     * Creates an event in DRAFT status.
     */
    private String createDraftEvent() {
        Event event = new Event();
        event.title = "Test Event";
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusHours(1);
        event.status = EventStatus.DRAFT;

        return given()
                .contentType(ContentType.JSON)
                .body(event)
                .post(EVENT_API)
                .then()
                .statusCode(201)
                .body("eventId", notNullValue())
                .extract()
                .path("eventId");
    }

    /**
     * Publishes an event by transitioning from DRAFT to PUBLISHED.
     */
    private String publishEvent(String eventId) {
        return given()
                .pathParam("eventId", eventId)
                .patch(EVENT_API + "/{eventId}/publish")
                .then()
                .statusCode(200)
                .extract()
                .path("eventId");
    }

    /**
     * Cancels an event by transitioning from PUBLISHED to CANCELLED.
     */
    private void cancelEvent(String eventId) {
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("{\"reason\": \"Test cancellation\"}")
                .patch(EVENT_API + "/{eventId}/cancel")
                .then()
                .statusCode(200);
    }


    @Test
    void testTransitionDraftToPublished() {
        String eventId = createDraftEvent();

        given()
                .pathParam("eventId", eventId)
                .patch(EVENT_API + "/{eventId}/publish")
                .then()
                .statusCode(200)
                .body("status", equalTo("PUBLISHED"));
    }

    @Test
    void testTransitionPublishedToCancelled() {
        String eventId = createDraftEvent();
        publishEvent(eventId);

        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("{\"reason\": \"Event cancelled\"}")
                .patch(EVENT_API + "/{eventId}/cancel")
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELLED"));
    }

    @Test
    void testDeleteDraftEvent() {
        String eventId = createDraftEvent();

        given()
                .pathParam("eventId", eventId)
                .delete(EVENT_API + "/{eventId}")
                .then()
                .statusCode(204);
    }

    @ParameterizedTest
    @MethodSource("invalidPublishTransitions")
    void testCannotPublishFromInvalidState(EventStatus fromStatus, String setupAction) {
        String eventId = createDraftEvent();

        // Move to the invalid state for publishing
        if (setupAction.equals("publish")) {
            publishEvent(eventId);
        } else if (setupAction.equals("cancel")) {
            publishEvent(eventId);
            cancelEvent(eventId);
        }

        // Attempt to publish again (should fail)
        given()
                .pathParam("eventId", eventId)
                .patch(EVENT_API + "/{eventId}/publish")
                .then()
                .statusCode(409);
    }

    static Stream<Arguments> invalidPublishTransitions() {
        return Stream.<Arguments>of(
                Arguments.of(EventStatus.PUBLISHED, "publish"), // Can't publish already published
                Arguments.of(EventStatus.CANCELLED, "cancel") // Can't publish cancelled
        );
    }

    @ParameterizedTest
    @MethodSource("invalidCancelTransitions")
    void testCannotCancelFromInvalidState(EventStatus fromStatus) {
        String eventId = createDraftEvent();

        // Attempt to cancel a DRAFT event (should fail)
        given()
                .pathParam("eventId", eventId)
                .contentType(ContentType.JSON)
                .body("{\"reason\": \"Test\"}")
                .patch(EVENT_API + "/{eventId}/cancel")
                .then()
                .statusCode(409);
    }

    static Stream<Arguments> invalidCancelTransitions() {
        return Stream.<Arguments>of(
                Arguments.of(EventStatus.DRAFT) // Can't cancel draft
        );
    }

    @Test
    void testCannotDeletePublishedEvent() {
        String eventId = createDraftEvent();
        publishEvent(eventId);

        given()
                .pathParam("eventId", eventId)
                .delete(EVENT_API + "/{eventId}")
                .then()
                .statusCode(409);
    }

    @Test
    void testCannotDeleteCancelledEvent() {
        String eventId = createDraftEvent();
        publishEvent(eventId);
        cancelEvent(eventId);

        given()
                .pathParam("eventId", eventId)
                .delete(EVENT_API + "/{eventId}")
                .then()
                .statusCode(409);
    }

    @Test
    void testFullEventLifecycle() {
        // Create event (DRAFT)
        String eventId = createDraftEvent();
        given()
                .pathParam("eventId", eventId)
                .get(EVENT_API + "/{eventId}")
                .then()
                .statusCode(200)
                .body("status", equalTo("DRAFT"));

        // Publish event (DRAFT → PUBLISHED)
        publishEvent(eventId);
        given()
                .pathParam("eventId", eventId)
                .get(EVENT_API + "/{eventId}")
                .then()
                .statusCode(200)
                .body("status", equalTo("PUBLISHED"));

        // Cancel event (PUBLISHED → CANCELLED)
        cancelEvent(eventId);
        given()
                .pathParam("eventId", eventId)
                .get(EVENT_API + "/{eventId}")
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELLED"));
    }

}
