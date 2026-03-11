package ch.unige.pinfo.event;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Test d'intégration pour EventResource.
 * @QuarkusTest démarre l'application complète en mode test.
 */
@QuarkusTest
class EventResourceTest {

    @Test
    void testGetAllEventsEndpoint() {
        given()
            .when().get("/api/events")
            .then()
                .statusCode(200);
    }
}
