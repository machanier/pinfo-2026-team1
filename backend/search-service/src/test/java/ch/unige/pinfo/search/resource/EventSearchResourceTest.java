package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.repository.SearchEventRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class EventSearchResourceTest {

    @Inject
    SearchEventRepository repository;

    private UUID eventId;

    @BeforeEach
    @Transactional
    void setup() {
        // Crée un événement de test
        eventId = UUID.randomUUID();
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Soirée Escalade";
        event.description = "Une belle soirée d'escalade";
        event.place = "Salle d'escalade du campus";
        event.time = OffsetDateTime.now().plusDays(1);
        event.category = "Sport";
        event.capacity = 20;
        event.registeredCount = 5;
        event.isFull = false;
        event.organizerName = "Club Escalade";

        repository.persist(event);
    }

    @Test
    void testApiSearchEventsGet() {
        given()
                .when()
                .queryParam("q", "escalade")
                .get("/api/search/events")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("content.size()", greaterThan(0)) // Au moins 1 résultat
                .body("content[0].title", equalTo("Soirée Escalade"))
                .body("totalElements", greaterThan(0));
    }

    @Test
    void testApiSearchEventsSuggestionsGet_BadRequest() {
        given()
                .when()
                .queryParam("q", "a")
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(400);
    }

    @Test
    void testApiSearchEventsSuggestionsGet_NullQuery() {
        given()
                .when()
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(400);
    }

    @Test
    void testApiSearchEventsSuggestionsGet_Success() {
        given()
                .when()
                .queryParam("q", "Soirée")
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("suggestions", notNullValue())
                .body("suggestions.size()", greaterThan(0));
    }

    @Test
    void testApiSearchEventsSuggestionsGet_WithLimit() {
        given()
                .when()
                .queryParam("q", "Soirée")
                .queryParam("limit", 5)
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("suggestions.size()", lessThanOrEqualTo(5));
    }

    @Test
    void testApiSearchEventsGet_NoResults() {
        given()
                .when()
                .queryParam("q", "xyzabc-inexistent")
                .get("/api/search/events")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("content.size()", is(0))
                .body("totalElements", is(0));
    }
}