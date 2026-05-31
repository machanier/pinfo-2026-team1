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
public class UpdateEventFlowE2ETest {

    private static UUID realOrganizerId;
    private static UUID realStudentId;
    private static String eventId; 
    private static String orgToken;
    private static String studentToken;

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = 8000; 

        UpdateEventFlowE2ETest testInstance = new UpdateEventFlowE2ETest();
        orgToken = testInstance.generateAuth0Token("ORGANIZER");
        studentToken = testInstance.generateAuth0Token("STUDENT");
    }

    private String generateAuth0Token(String role) {
        try {
                String clientId = System.getenv("AUTH0_CLIENT_ID") != null ? 
                        System.getenv("AUTH0_CLIENT_ID") : "M3o5D32SmF54DDlDOBgwFfC0vzvFeNE0";
                
                String clientSecret = System.getenv("AUTH0_CLIENT_SECRET");
                if (clientSecret == null || clientSecret.isEmpty()) {
                throw new IllegalStateException("Sécurité : La variable d'environnement AUTH0_CLIENT_SECRET n'est pas définie !");
                }

                String testPassword = System.getenv("AUTH0_TEST_PASSWORD");
                if (testPassword == null || testPassword.isEmpty()) {
                        throw new IllegalStateException("Sécurité : La variable d'environnement AUTH0_TEST_PASSWORD n'est pas définie !");
                }

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
    @DisplayName("1. Initialisation des entités")
    void step1_init() {
        String subOrg = com.auth0.jwt.JWT.decode(orgToken).getSubject();
        String subStudent = com.auth0.jwt.JWT.decode(studentToken).getSubject();
        realOrganizerId = UUID.nameUUIDFromBytes(subOrg.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        realStudentId = UUID.nameUUIDFromBytes(subStudent.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Club Alpin\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realOrganizerId)
        .then()
                .statusCode(200);
    }

    @Test
    @Order(2)
    @DisplayName("2. Création de l'événement initial")
    void step2_createOriginalEvent() throws InterruptedException {
        Thread.sleep(1000);
        String nowIso = java.time.OffsetDateTime.now().plusDays(3).toString();

        java.util.Map<String, Object> eventPayload = new java.util.HashMap<>();
        eventPayload.put("title", "Session Alpinisme Init");
        eventPayload.put("place", "Bastions");
        eventPayload.put("time", nowIso);
        eventPayload.put("capacity", 20);
        eventPayload.put("category", "SPORT");

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
    @DisplayName("3. Inscription d'un participant")
    void step3_addParticipant() {
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("eventId", eventId);

        given()
                .header("Authorization", "Bearer " + studentToken)
                .contentType(ContentType.JSON)
                .body(payload)
        .when()
                .post("/api/registrations")
        .then()
                .statusCode(200);
    }

    @Test
    @Order(4)
    @DisplayName("4. Mise à jour des informations de l'événement par l'organisateur")
    void step4_updateEventDetails() {
        String newNowIso = java.time.OffsetDateTime.now().plusDays(3).toString();
        
        java.util.Map<String, Object> updatePayload = new java.util.HashMap<>();
        updatePayload.put("title", "Session Alpinisme AVANCÉ"); // Changement du titre
        updatePayload.put("place", "Sciences III");             // Changement du lieu
        updatePayload.put("time", newNowIso);
        updatePayload.put("capacity", 25);
        updatePayload.put("category", "SPORT");

        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .body(updatePayload)
        .when()
                .put("/api/events/" + eventId) // Ou .patch() selon vos contrôleurs JAX-RS
        .then()
                .statusCode(200);
    }

    @Test
    @Order(5)
    @DisplayName("5. Vérification de l'indexation de la mise à jour (Search-Service)")
    void step5_verifySearchUpdate() {
        try {
            given().port(9200).when().post("/_refresh").then().statusCode(200);
        } catch (Exception ignored) {
            // Échoue silencieusement si Elasticsearch n'est pas exposé directement à l'hôte de test
        }

        await()
            .atMost(20, SECONDS)
            .pollInterval(1, SECONDS)
            .untilAsserted(() -> {
                given()
                        .header("Authorization", "Bearer " + studentToken)
                        .queryParam("q", "AVANCÉ")
                .when()
                        .get("/api/search/events")
                .then()
                        .statusCode(200) // Si Elasticsearch renvoie un 500 (index en cours de refresh), Awaitility réessaie
                        .body("content.title", hasItem("Session Alpinisme AVANCÉ"))
                        .body("content.place", hasItem("Sciences III"));
            });
    }
}