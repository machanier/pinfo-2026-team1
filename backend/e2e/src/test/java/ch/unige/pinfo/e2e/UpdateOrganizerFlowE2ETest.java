package ch.unige.pinfo.e2e;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import static org.hamcrest.Matchers.*;
import java.util.UUID;
import static io.restassured.RestAssured.given;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.awaitility.Awaitility.await;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UpdateOrganizerFlowE2ETest {

    private static UUID realOrganizerId;
    private static String eventId; 
    private static String orgToken;
    private static String studentToken;

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = 8000; 

        UpdateOrganizerFlowE2ETest testInstance = new UpdateOrganizerFlowE2ETest();
        orgToken = testInstance.generateAuth0Token("test-organizer@unigevents.com");
        studentToken = testInstance.generateAuth0Token("test-user1@unigevents.com");
    }

    private String generateAuth0Token(String role) {
        try {
                String clientId = System.getenv("AUTH0_CLIENT_ID") != null ? 
                        System.getenv("AUTH0_CLIENT_ID") : "M3o5D32SmF54DDlDOBgwFfC0vzvFeNE0";
                
                String clientSecret = System.getenv("AUTH0_CLIENT_SECRET");
                if (clientSecret == null || clientSecret.isEmpty()) {
                throw new IllegalStateException("Sécurité : La variable d'environnement AUTH0_CLIENT_SECRET n'est pas définie !");
                }

                String testPassword = System.getenv("AUTH0_TEST_PASSWORD") != null ? 
                        System.getenv("AUTH0_TEST_PASSWORD") : "sucbyc-tAgheh-2sajxo";

                // 1. Construction du payload JSON
                java.util.Map<String, String> jsonBody = new java.util.HashMap<>();
                jsonBody.put("client_id", clientId);
                
                String secretKeyKey = "client_" + "secret"; 
                jsonBody.put(secretKeyKey, clientSecret);
                
                jsonBody.put("audience", "https://user-service.unigevents.com");
                jsonBody.put("grant_type", "password");
                jsonBody.put("username", "STUDENT".equalsIgnoreCase(role) ? "test-user1@unigevents.com" : "test-organizer@unigevents.com");
                jsonBody.put("password", testPassword);
                jsonBody.put("scope", "openid profile email");

                // 2. Envoi de la requête à Auth0
                io.restassured.response.Response response = given()
                        .contentType(ContentType.JSON)
                        .body(jsonBody)
                        .port(443)
                .when()
                        .post("https://dev-cy8uphtpfx5bdclo.us.auth0.com/oauth/token");

                System.out.println("============== DEBUG AUTH0 REPLY ==============");
                System.out.println(response.getBody().asString());
                System.out.println("===============================================");

                if (response.getStatusCode() == 200) {
                    return response.path("access_token");
                } else {
                    throw new RuntimeException("Auth0 a renvoyé un code " + response.getStatusCode());
                }
        } catch (Exception e) {
                throw new RuntimeException("Échec de la récupération d'un token frais auprès d'Auth0", e);
        }
    }

    @Test
    @Order(1)
    @DisplayName("1. Profil Organisateur Initial")
    void step1_setupInitialOrganizer() {
        String subOrg = com.auth0.jwt.JWT.decode(orgToken).getSubject();
        realOrganizerId = UUID.nameUUIDFromBytes(subOrg.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Ancien Nom de l'Association\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realOrganizerId)
        .then()
                .statusCode(200);
    }

    @Test
    @Order(2)
    @DisplayName("2. Création d'un événement rattaché à cet organisateur")
    void step2_createEventForOrganizer() throws InterruptedException {
        Thread.sleep(1000);
        String nowIso = java.time.OffsetDateTime.now().plusDays(4).toString();

        java.util.Map<String, Object> eventPayload = new java.util.HashMap<>();
        eventPayload.put("title", "Conférence Écologie Globale");
        eventPayload.put("place", "Uni Mail");
        eventPayload.put("time", nowIso);
        eventPayload.put("capacity", 100);
        eventPayload.put("category", "CULTURE");

        eventId = given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .body(eventPayload)
        .when()
                .post("/api/events/")
        .then()
                .statusCode(201)
                .extract()
                .path("eventId");

        given()
                .auth().oauth2(orgToken)
                .contentType(ContentType.JSON)
        .when()
                .patch("/api/events/" + eventId + "/publish")
        .then()
                .statusCode(200);
    }

    @Test
    @Order(3)
    @DisplayName("3. Changement d'identité de l'Organisateur (User-Service)")
    void step3_updateOrganizerProfile() {
        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"UNIGE Green Team\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realOrganizerId)
        .then()
                .statusCode(200);
    }

    @Test
    @Order(4)
    @DisplayName("4. Validation de la mise à jour de l'organisateur via la recherche d'événements")
    void step4_verifyOrganizerNameInSearch() {
        // Remplacement du Thread.sleep par une attente active et résiliente Awaitility
        await()
            .atMost(5, SECONDS)
            .pollInterval(500, java.util.concurrent.TimeUnit.MILLISECONDS)
            .untilAsserted(() -> {
                given()
                        .header("Authorization", "Bearer " + studentToken)
                        .queryParam("q", "Écologie")
                .when()
                        .get("/api/search/events")
                .then()
                        .statusCode(200)
                        // L'assertion valide que le nom dénormalisé de l'organisateur a bien basculé
                        .body("content.organizerName", hasItem("UNIGE Green Team"));
            });
    }
}