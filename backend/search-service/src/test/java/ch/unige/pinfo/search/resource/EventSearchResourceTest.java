package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import ch.unige.pinfo.search.service.EventSearchService;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.hasItems;
import static org.mockito.ArgumentMatchers.*;

@QuarkusTest
public class EventSearchResourceTest {

    @Inject
    EventSearchService searchService;

    @AfterEach
    void tearDown() {
        // Très important pour éviter les effets de bord entre les tests
        PanacheMock.reset();
    }

    @Test
    void testApiSearchEventsGet() {
        EventSearchResult mockResult = new EventSearchResult();
        mockResult.setTotalElements(0);
        mockResult.setContent(Collections.emptyList());
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
                .body("content.size()", is(0))
                .body("totalElements", is(0));
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
        // 1. On active le mock de Panache pour l'entité SearchEvent
        PanacheMock.mock(SearchEvent.class);

        // 2. On simule un jeu d'événements qui sera retourné
        SearchEvent e1 = new SearchEvent();
        e1.title = "Football inter-fac";
        SearchEvent e2 = new SearchEvent();
        e2.title = "Tournoi de Basket";

        // 3. On mock la chaîne fluide : SearchEvent.find().page().list()
        PanacheQuery<SearchEvent> mockQuery = Mockito.mock(PanacheQuery.class);
        Mockito.when(SearchEvent.<SearchEvent>find(anyString(), any(Object[].class))).thenReturn(mockQuery);
        Mockito.when(mockQuery.page(anyInt(), anyInt())).thenReturn(mockQuery);
        Mockito.when(mockQuery.list()).thenReturn(List.of(e1, e2));

        given()
                .when()
                .queryParam("q", "sport")
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                // 4. On vérifie que les titres mockés redescendent bien dans la réponse JSON
                .body("suggestions", hasItems("Football inter-fac", "Tournoi de Basket"));
    }

    @Test
    void testApiSearchEventsSuggestionsGet_WithLimit() {
        PanacheMock.mock(SearchEvent.class);

        SearchEvent e1 = new SearchEvent();
        e1.title = "Soirée Escalade";

        PanacheQuery<SearchEvent> mockQuery = Mockito.mock(PanacheQuery.class);
        Mockito.when(SearchEvent.<SearchEvent>find(anyString(), any(Object[].class))).thenReturn(mockQuery);
        // On vérifie de façon stricte que la limite transmise à page() est bien notre
        // paramètre (ici 5)
        Mockito.when(mockQuery.page(0, 5)).thenReturn(mockQuery);
        Mockito.when(mockQuery.list()).thenReturn(List.of(e1));

        given()
                .when()
                .queryParam("q", "esca")
                .queryParam("limit", 5)
                .get("/api/search/events/suggestions")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("suggestions[0]", is("Soirée Escalade"));
    }
}