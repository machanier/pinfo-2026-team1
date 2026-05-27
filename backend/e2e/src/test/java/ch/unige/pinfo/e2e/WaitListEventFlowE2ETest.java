package ch.unige.pinfo.e2e;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import static org.hamcrest.Matchers.*;
import java.util.UUID;
import static io.restassured.RestAssured.given;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class WaitListEventFlowE2ETest {

    private static UUID realOrganizerId;
    private static UUID realStudent1Id;
    private static UUID realStudent2Id;
    private static String eventId; 
    private static String orgToken;
    private static String student1Token;
    private static String student2Token;

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = 8000; 

        WaitListEventFlowE2ETest testInstance = new WaitListEventFlowE2ETest();
        orgToken = testInstance.generateAuth0Token("test-organizer@unigevents.com");
        student1Token = testInstance.generateAuth0Token("test-user1@unigevents.com");
        // Utilisation d'un second compte de test étudiant pour saturer la liste
        student2Token = testInstance.generateAuth0Token("test-user2@unigevents.com"); 
    }

    private String generateAuth0Token(String username) {
        try {
            String clientId = System.getenv("AUTH0_CLIENT_ID") != null ? System.getenv("AUTH0_CLIENT_ID") : "M3o5D32SmF54DDlDOBgwFfC0vzvFeNE0";
            String clientSecret = System.getenv("AUTH0_CLIENT_SECRET");
            String testPassword = System.getenv("AUTH0_TEST_PASSWORD") != null ? System.getenv("AUTH0_TEST_PASSWORD") : "test12345*%";

            java.util.Map<String, String> jsonBody = new java.util.HashMap<>();
            jsonBody.put("client_id", clientId);
            jsonBody.put("client_" + "secret", clientSecret);
            jsonBody.put("audience", "https://user-service.unigevents.com");
            jsonBody.put("grant_type", "password");
            jsonBody.put("username", username);
            jsonBody.put("password", testPassword);
            jsonBody.put("scope", "openid profile email");

            return given()
                    .contentType(ContentType.JSON)
                    .body(jsonBody)
                    .port(443)
            .when()
                    .post("https://dev-cy8uphtpfx5bdclo.us.auth0.com/oauth/token")
            .then()
                    .statusCode(200)
                    .extract()
                    .path("access_token");
        } catch (Exception e) {
            throw new RuntimeException("Échec Auth0 pour " + username, e);
        }
    }

    @Test
    @Order(1)
    @DisplayName("1. Synchronisation de l'infrastructure utilisateur (3 profils)")
    void step1_syncThreeUsers() {
        String subOrg = com.auth0.jwt.JWT.decode(orgToken).getSubject();
        String subStudent1 = com.auth0.jwt.JWT.decode(student1Token).getSubject();
        String subStudent2 = com.auth0.jwt.JWT.decode(student2Token).getSubject();

        realOrganizerId = UUID.nameUUIDFromBytes(subOrg.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        realStudent1Id = UUID.nameUUIDFromBytes(subStudent1.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        realStudent2Id = UUID.nameUUIDFromBytes(subStudent2.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        // Enregistrement de l'organisateur
        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Club Escalade\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realOrganizerId)
        .then()
                .statusCode(200);

        // Enregistrement de l'étudiant 1
        given()
                .header("Authorization", "Bearer " + student1Token)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Alice\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realStudent1Id)
        .then()
                .statusCode(200);

        // Enregistrement de l'étudiant 2
        given()
                .header("Authorization", "Bearer " + student2Token)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Bob\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realStudent2Id)
        .then()
                .statusCode(200);
    }

    @Test
    @Order(2)
    @DisplayName("2. Création d'un événement à capacité limitée (1 place)")
    void step2_createLimitedEvent() throws InterruptedException {
        Thread.sleep(2000);
        String nowIso = java.time.OffsetDateTime.now().plusDays(2).toString();

        java.util.Map<String, Object> eventPayload = new java.util.HashMap<>();
        eventPayload.put("title", "Escalade Privée Premium");
        eventPayload.put("place", "Salle Clos-Voltaire");
        eventPayload.put("time", nowIso);
        eventPayload.put("capacity", 1); // 👈 CRUCIAL : Seulement 1 place disponible !
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

        // Publication
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
    @DisplayName("3. Inscription de l'Étudiant 1 -> Doit être CONFIRMED")
    void step3_registerStudent1() {
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("eventId", eventId);

        given()
                .header("Authorization", "Bearer " + student1Token)
                .contentType(ContentType.JSON)
                .body(payload)
        .when()
                .post("/api/registrations")
        .then()
                .statusCode(anyOf(equalTo(200), equalTo(201)))
                .body("status", equalTo("CONFIRMED"));
    }

    @Test
    @Order(4)
    @DisplayName("4. Inscription de l'Étudiant 2 -> Doit basculer en Waitlist (PENDING)")
    void step4_registerStudent2WithWaitlist() {
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("eventId", eventId);

        given()
                .header("Authorization", "Bearer " + student2Token)
                .contentType(ContentType.JSON)
                .body(payload)
        .when()
                .post("/api/registrations")
        .then()
                .statusCode(anyOf(equalTo(200), equalTo(201)))
                // Selon l'implémentation, le statut d'attente est "PENDING" ou une variante métier
                .body("status", anyOf(equalTo("PENDING"), equalTo("WAITLIST")))
                // On s'assure que la position dans la liste d'attente est alimentée (ex: position 1 ou >= 0)
                .body("waitlistPosition", notNullValue()); 
    }
}