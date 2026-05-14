package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import ch.unige.pinfo.search.service.EventSearchService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.mockito.ArgumentMatchers.*;

@QuarkusTest
public class EventSearchResourceTest {

    @InjectMock
    EventSearchService searchService;

    @Test
    void testApiSearchEventsGet() {
        // Préparation du mock avec les bons noms de méthodes
        EventSearchResult mockResult = new EventSearchResult();
        mockResult.setTotalElements(0); // Au lieu de setTotal
        mockResult.setContent(Collections.emptyList()); // Au lieu de setEvents
        mockResult.setPage(0);
        mockResult.setSize(20);

        Mockito.when(searchService.search(any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(mockResult);

        given()
                .when()
                .queryParam("q", "escalade")
                .get("/api/search/events")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                // Note : RestAssured vérifie le JSON, donc on utilise le nom du champ
                // @JsonProperty("content")
                .body("content.size()", is(0))
                .body("totalElements", is(0));
    }

    @Test
    void testApiSearchEventsSuggestionsGet_BadRequest() {
        // Test de la branche logicielle : q trop court (< 2 chars)
        given()
                .when()
                .queryParam("q", "a")
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(400); // Doit renvoyer BadRequestException
    }

    @Test
    void testApiSearchEventsSuggestionsGet_Success() {
        // Note: Pour tester la branche suggestions avec Panache (SearchEvent.find),
        // si tu n'as pas de DB de test configurée, tu devras utiliser PanacheMock.
        // Ici, on teste au moins l'appel réseau.
        given()
                .when()
                .queryParam("q", "sport")
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON);
    }
}