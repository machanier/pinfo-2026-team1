package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.repository.SearchEventRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class EventSearchResourceTest {

        @Inject
        SearchEventRepository repository;

        private UUID eventId;
        private UUID organizerId;

        @BeforeEach
        @Transactional
        void setup() {
                // Crée un événement de test
                eventId = UUID.randomUUID();
                organizerId = UUID.randomUUID();
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
                event.organizerId = organizerId;

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
        void testApiSearchEventsGet_Pagination() {
                // Test que la pagination fonctionne avec page et size
                given()
                                .when()
                                .queryParam("q", "escalade")
                                .queryParam("page", 0)
                                .queryParam("size", 10)
                                .get("/api/search/events")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("content.size()", lessThanOrEqualTo(10))
                                .body("page", is(0))
                                .body("size", is(10));
        }

        @Test
        void testApiSearchEventsGet_filterByOrganizerId() {
                // Known organizerId should return at least the setUp event
                given()
                                .when()
                                .queryParam("organizerId", organizerId.toString())
                                .get("/api/search/events")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("content.size()", greaterThanOrEqualTo(1))
                                .body("content[0].organizerId", equalTo(organizerId.toString()));

                // Random UUID not in DB should return no results
                given()
                                .when()
                                .queryParam("organizerId", UUID.randomUUID().toString())
                                .get("/api/search/events")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("content.size()", is(0));
        }

        @Test
        void testApiSearchEventsGet_filterByPlace() {
                // "escalade" matches "Salle d'escalade du campus" (case-insensitive LIKE)
                given()
                                .when()
                                .queryParam("place", "escalade")
                                .get("/api/search/events")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("content.size()", greaterThanOrEqualTo(1));

                // Non-matching place should return 0 results
                given()
                                .when()
                                .queryParam("place", "nonexistent_place_xyz")
                                .get("/api/search/events")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("content.size()", is(0));
        }

        @Test
        void testApiSearchEventsGet_hasAvailableSlots_withNullRegisteredCount() {
                UUID nullCountEventId = UUID.randomUUID();
                UUID fullEventId = UUID.randomUUID();

                // Commit data BEFORE the REST call so the endpoint's transaction can see it
                QuarkusTransaction.requiringNew().run(() -> {
                        SearchEvent nullCountEvent = new SearchEvent();
                        nullCountEvent.eventId = nullCountEventId;
                        nullCountEvent.title = "Event Null Count";
                        nullCountEvent.place = "Test Place";
                        nullCountEvent.time = OffsetDateTime.now().plusDays(2);
                        nullCountEvent.capacity = 10;
                        nullCountEvent.registeredCount = null;
                        nullCountEvent.isFull = false;
                        repository.persist(nullCountEvent);

                        SearchEvent fullEvent = new SearchEvent();
                        fullEvent.eventId = fullEventId;
                        fullEvent.title = "Full Event No Slots";
                        fullEvent.place = "Test Place";
                        fullEvent.time = OffsetDateTime.now().plusDays(2);
                        fullEvent.capacity = 5;
                        fullEvent.registeredCount = 5;
                        fullEvent.isFull = true;
                        repository.persist(fullEvent);
                });
                // hasAvailableSlots=true should include null-registeredCount event (treated as
                // 0)
                given()
                                .when()
                                .queryParam("hasAvailableSlots", true)
                                .queryParam("q", "Null Count")
                                .get("/api/search/events")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("content.size()", greaterThanOrEqualTo(1));

                // Full event (registeredCount >= capacity) should be excluded by
                // hasAvailableSlots filter
                given()
                                .when()
                                .queryParam("hasAvailableSlots", true)
                                .queryParam("q", "No Slots")
                                .get("/api/search/events")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("content.size()", is(0));

                // Cleanup committed test data
                QuarkusTransaction.requiringNew().run(() -> {
                        repository.deleteByEventId(nullCountEventId);
                        repository.deleteByEventId(fullEventId);
                });
        }
}