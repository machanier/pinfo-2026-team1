package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.repository.SearchEventRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.hasItems;

@QuarkusTest
public class EventSearchResourceTest {

    @Inject
    SearchEventRepository repository;

    private UUID eventId = UUID.randomUUID();

    @BeforeEach
    @Transactional
    void setup() {
        // Create test data
        SearchEvent event1 = new SearchEvent();
        event1.eventId = eventId;
        event1.title = "Football inter-fac";
        event1.capacity = 50;
        event1.registeredCount = 0;
        repository.persist(event1);

        SearchEvent event2 = new SearchEvent();
        event2.eventId = UUID.randomUUID();
        event2.title = "Tournoi de Basket";
        event2.capacity = 30;
        event2.registeredCount = 0;
        repository.persist(event2);
    }

    @Test
    void testApiSearchEventsGet() {
        given()
                .when()
                .queryParam("q", "football")
                .queryParam("page", 0)
                .queryParam("size", 20)
                .get("/api/search/events")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("content.size()", is(1))
                .body("content[0].title", is("Football inter-fac"));
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
                .queryParam("q", "football")
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("suggestions", hasItems("Football inter-fac"));
    }

    @Test
    void testApiSearchEventsSuggestionsGet_WithLimit() {
        given()
                .when()
                .queryParam("q", "basket")
                .queryParam("limit", 5)
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("suggestions[0]", is("Tournoi de Basket"));
    }
}
