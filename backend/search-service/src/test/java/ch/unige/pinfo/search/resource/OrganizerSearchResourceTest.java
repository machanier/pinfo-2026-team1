package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.openapi.model.OrganizerSearchResult;
import ch.unige.pinfo.search.service.OrganizerSearchService;
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
public class OrganizerSearchResourceTest {

    @InjectMock
    OrganizerSearchService organizerSearchService;

    @Test
    void testApiSearchOrganizersGet() {
        // 1. Préparation des données simulées
        OrganizerSearchResult mockResult = new OrganizerSearchResult();
        // Vérifie si c'est setContent ou setOrganizers selon ton fichier généré
        mockResult.setContent(Collections.emptyList());
        mockResult.setTotalElements(0);

        // 2. Mock du service
        Mockito.when(organizerSearchService.search(anyString(), anyInt(), anyInt()))
                .thenReturn(mockResult);

        // 3. Appel API et vérification
        given()
                .when()
                .queryParam("q", "club")
                .queryParam("page", 0)
                .queryParam("size", 10)
                .get("/api/search/organizers")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("totalElements", is(0))
                .body("content.size()", is(0));
    }

    @Test
    void testApiSearchOrganizersGet_DefaultParameters() {
        OrganizerSearchResult mockResult = new OrganizerSearchResult();
        mockResult.setContent(Collections.emptyList());
        mockResult.setTotalElements(0);

        Mockito.when(organizerSearchService.search(null, 0, 20))
                .thenReturn(mockResult);

        given()
                .when()
                .get("/api/search/organizers")
                .then()
                .statusCode(200);

        // Vérifie que le service a bien reçu les valeurs par défaut (null, 0, 20)
        Mockito.verify(organizerSearchService).search(null, 0, 20);
    }
}