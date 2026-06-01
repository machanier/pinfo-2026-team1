package ch.unige.pinfo.e2e;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import static org.hamcrest.Matchers.*;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import static io.restassured.RestAssured.given;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class EligibilityEventFlowE2ETest {

    private static UUID realOrganizerId;
    private static UUID eligibleStudentId;
    private static UUID nonEligibleStudentId;
    private static String eventId; 
    private static String orgToken;
    private static String eligibleStudentToken;
    private static String nonEligibleStudentToken;

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = 8000; 

        EligibilityEventFlowE2ETest testInstance = new EligibilityEventFlowE2ETest();
        orgToken = testInstance.generateAuth0Token("test-organizer@unigevents.com");
        
        // test-user1 sera notre étudiant éligible (ex: Faculté des Sciences, Master)
        eligibleStudentToken = testInstance.generateAuth0Token("test-user1@unigevents.com");
        
        // test-user2 sera notre étudiant recalé (ex: Faculté de Médecine ou niveau Bachelor)
        nonEligibleStudentToken = testInstance.generateAuth0Token("test-user2@unigevents.com"); 
    }

    private String generateAuth0Token(String email) {
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

            Map<String, String> jsonBody = new HashMap<>();
            jsonBody.put("client_id", clientId);
            jsonBody.put("client_secret", clientSecret);
            jsonBody.put("audience", "https://user-service.unigevents.com");
            jsonBody.put("grant_type", "password");
            jsonBody.put("username", email); 
            jsonBody.put("password", testPassword);
            jsonBody.put("scope", "openid profile email");

            io.restassured.response.Response response = given()
                    .contentType(ContentType.JSON)
                    .body(jsonBody)
                    .port(443)
            .when()
                    .post("https://dev-cy8uphtpfx5bdclo.us.auth0.com/oauth/token");

            if (response.getStatusCode() == 200) {
                return response.path("access_token");
            } else {
                throw new RuntimeException("Auth0 a renvoyé un code " + response.getStatusCode() + " pour l'utilisateur " + email);
            }
        } catch (Exception e) {
            throw new RuntimeException("Échec de la récupération d'un token frais auprès d'Auth0", e);
        }
    }

    @Test
    @Order(1)
    @DisplayName("1. Enregistrement des profils avec attributs académiques distincts")
    void step1_syncUsersWithAcademicProfiles() {
        String subOrg = com.auth0.jwt.JWT.decode(orgToken).getSubject();
        String subEligible = com.auth0.jwt.JWT.decode(eligibleStudentToken).getSubject();
        String subNonEligible = com.auth0.jwt.JWT.decode(nonEligibleStudentToken).getSubject();

        realOrganizerId = UUID.nameUUIDFromBytes(subOrg.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        eligibleStudentId = UUID.nameUUIDFromBytes(subEligible.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        nonEligibleStudentId = UUID.nameUUIDFromBytes(subNonEligible.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        // Enregistrement de l'organisateur
        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Association des Sciences\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realOrganizerId)
        .then()
                .statusCode(200);

        // Enregistrement de l'étudiant ÉLIGIBLE (Sciences + Master)
        given()
                .header("Authorization", "Bearer " + eligibleStudentToken)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Alice\", \"faculty\": \"SCIENCES\", \"degreeLevel\": \"MASTER\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + eligibleStudentId)
        .then()
                .statusCode(200);

        // Enregistrement de l'étudiant NON ÉLIGIBLE (Médecine + Bachelor)
        given()
                .header("Authorization", "Bearer " + nonEligibleStudentToken)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Bob\", \"faculty\": \"MEDECINE\", \"degreeLevel\": \"BACHELOR\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + nonEligibleStudentId)
        .then()
                .statusCode(200);
    }

    @Test
    @Order(2)
    @DisplayName("2. Création d'un événement restreint aux étudiants en Master Sciences")
    void step2_createRestrictedEvent() throws InterruptedException {
        Thread.sleep(2000);
        String nowIso = java.time.OffsetDateTime.now().plusDays(5).toString();

        // Construction des critères de restriction
        Map<String, Object> restrictions = new HashMap<>();
        restrictions.put("faculties", List.of("SCIENCES"));
        restrictions.put("degreeLevels", List.of("MASTER"));

        Map<String, Object> eventPayload = new HashMap<>();
        eventPayload.put("title", "Séminaire de Recherche Avancé");
        eventPayload.put("place", "Sciences III, Auditoire A300");
        eventPayload.put("time", nowIso);
        eventPayload.put("capacity", 10);
        eventPayload.put("category", "CULTURE");
        eventPayload.put("restrictedTo", restrictions); // 👈 Application des restrictions

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

        // Publication de l'événement
        given()
                .auth().oauth2(orgToken)
                .contentType(ContentType.JSON)
        .when()
                .patch("/api/events/" + eventId + "/submit")
        .then()
                .statusCode(200);
    }

    @Test
    @Order(3)
    @DisplayName("3. Inscription de l'étudiant ciblé -> Succès attendu (200/201)")
    void step3_registerEligibleStudent() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventId", eventId);

        given()
                .header("Authorization", "Bearer " + eligibleStudentToken)
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
    @DisplayName("4. Inscription de l'étudiant hors-critères -> Refus attendu (403 Forbidden)")
    void step4_registerNonEligibleStudent() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventId", eventId);

        given()
                .header("Authorization", "Bearer " + nonEligibleStudentToken)
                .contentType(ContentType.JSON)
                .body(payload)
        .when()
                .post("/api/registrations")
        .then()
                // L'API doit interdire l'action avec un code d'erreur HTTP adéquat
                .statusCode(equalTo(403)) 
                // Optionnel : adapter selon le format d'erreur de ton application (ex: "message", "error")
                .body("message", anyOf(
                    containsStringIgnoringCase("eligible"), 
                    containsStringIgnoringCase("restriction"),
                    containsStringIgnoringCase("forbidden")
                ));
    }
}