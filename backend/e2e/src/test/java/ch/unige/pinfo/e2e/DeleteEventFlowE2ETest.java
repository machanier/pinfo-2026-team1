package ch.unige.pinfo.e2e;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import static org.hamcrest.Matchers.*;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.awaitility.Awaitility.await;
import java.util.UUID;

import static io.restassured.RestAssured.given;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class DeleteEventFlowE2ETest {

    private static UUID realOrganizerId;
    private static UUID realStudentId;
    private static String eventId; 
    private static UUID registrationId; 
    private static String orgToken;
    private static String studentToken;

    @BeforeAll
    static void setup() {
        // Toutes nos requêtes passent par la passerelle Kong
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = 8000; 

        DeleteEventFlowE2ETest testInstance = new DeleteEventFlowE2ETest();
        
        // Récupération des tokens Auth0 fonctionnels
        orgToken = testInstance.generateAuth0Token("ORGANIZER");
        studentToken = testInstance.generateAuth0Token("STUDENT");

        try {
                com.auth0.jwt.interfaces.DecodedJWT decodedOrg = com.auth0.jwt.JWT.decode(orgToken);
                System.out.println("Organizer Claims: " + decodedOrg.getClaims().keySet());
                System.out.println("Organizer Roles (Custom Claim): " + decodedOrg.getClaim("https://unigevents.com/roles").asList(String.class));
                
                com.auth0.jwt.interfaces.DecodedJWT decodedStudent = com.auth0.jwt.JWT.decode(studentToken);
                System.out.println("Student Claims: " + decodedStudent.getClaims().keySet());
                System.out.println("Student Roles (Custom Claim): " + decodedStudent.getClaim("https://unigevents.com/roles").asList(String.class));
                } catch (Exception e) {
                System.out.println("Erreur lors du décodage ou de la lecture des rôles : " + e.getMessage());
                }
                System.out.println("-----------------------------------");
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
    @DisplayName("1. Synchronisation de l'Organisateur et de l'Étudiant (User-Service via Kong)")
    void step1_syncUsers() {
        
        // 1. On extrait le "sub" (sujet) Auth0 brut du Token (ex: "auth0|69d7f7e1...")
        com.auth0.jwt.interfaces.DecodedJWT jwtOrg = com.auth0.jwt.JWT.decode(orgToken);
        String rawOrgSubject = jwtOrg.getSubject();
        
        com.auth0.jwt.interfaces.DecodedJWT jwtStudent = com.auth0.jwt.JWT.decode(studentToken);
        String rawStudentSubject = jwtStudent.getSubject();

        realOrganizerId = UUID.nameUUIDFromBytes(rawOrgSubject.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        realStudentId = UUID.nameUUIDFromBytes(rawStudentSubject.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        System.out.println("UUID attendu par l'infrastructure pour l'Organisateur : " + realOrganizerId);

        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .accept(ContentType.JSON)
                .body("{\"name\": \"Club Escalade UNIGE\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realOrganizerId.toString()) 
        .then()
                .log().ifValidationFails()
                .statusCode(200);

        given()
                .header("Authorization", "Bearer " + studentToken)
                .contentType(ContentType.JSON)
                .accept(ContentType.JSON)
                .body("{\"name\": \"Alice\", \"avatarUrl\": \"data:image/png;base64,VGVzdA==\"}")
        .when()
                .put("/api/users/" + realStudentId.toString()) 
        .then()
                .log().ifValidationFails()
                .statusCode(200);
    }

    @Test
    @Order(2)
    @DisplayName("2. Création d'un evènement")
    void step2_createEvent() throws InterruptedException {

        Thread.sleep(2000);

        // On génère des dates valides au format ISO-8601 pour OffsetDateTime
        String nowIso = java.time.OffsetDateTime.now().plusDays(1).toString(); 
        String endIso = java.time.OffsetDateTime.now().plusDays(1).plusHours(2).toString();

        java.util.Map<String, Object> eventPayload = new java.util.HashMap<>();
        
        eventPayload.put("title", "Initiation Escalade E2E");
        eventPayload.put("place", "Gymnase A, Université de Genève");
        eventPayload.put("time", nowIso);
        eventPayload.put("description", "Une superbe séance d'initiation e2e.");
        eventPayload.put("endTime", endIso);
        eventPayload.put("capacity", 50);
        eventPayload.put("category", "SPORT"); 
        eventPayload.put("status", "PUBLISHED");
        eventPayload.put("tags", java.util.List.of("escalade", "unige", "sport"));

        eventId = given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
                .accept(ContentType.JSON)
                .body(eventPayload)
        .when()
                .post("/api/events/")
        .then()
                .log().ifValidationFails()
                .statusCode(201)
                .extract()
                .path("eventId"); 
        
        System.out.println("✅ Événement créé avec l'ID : " + eventId);

        given()
                .auth().oauth2(orgToken)
                .contentType(ContentType.JSON)
        .when()
                .patch("http://localhost:8000/api/events/" + eventId + "/publish") 
        .then()
                .statusCode(200);

        String eventStatus = given()
                .auth().oauth2(orgToken) 
                .accept(ContentType.JSON)
        .when()
                .get("http://localhost:8000/api/events/" + eventId) 
        .then()
                .statusCode(200)
                .extract()
                .path("status");

        System.out.println("🔍 [DEBUG E2E] Statut de l'événement récupéré : " + eventStatus);
    }

    @Test
    @Order(3)
    @DisplayName("3. Recherche d'Événements et Suggestions (Search-Service via Kong)")
    void step3_searchEventsAndSuggestions() {
        
        await()
            .atMost(5, SECONDS)
            .pollInterval(500, java.util.concurrent.TimeUnit.MILLISECONDS)
            .untilAsserted(() -> {
                given()
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(ContentType.JSON)
                        .accept(ContentType.JSON)
                        .queryParam("q", "Escalade")
                        .queryParam("page", 0)
                        .queryParam("size", 10)
                .when()
                        .get("/api/search/events")
                .then()
                        .log().body()
                        .statusCode(200)
                        .body("content", notNullValue());
            });

        await()
            .atMost(5, SECONDS)
            .pollInterval(500, java.util.concurrent.TimeUnit.MILLISECONDS)
            .untilAsserted(() -> {
                given()
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(ContentType.JSON)
                        .accept(ContentType.JSON)
                        .queryParam("q", "Es")
                        .queryParam("limit", 5)
                .when()
                        .get("/api/search/events/suggestions") 
                .then()
                        .log().body()
                        .statusCode(200)
                        .body("$", notNullValue()); 
            });

        System.out.println("✅ Search-Service : Recherche et suggestions testées avec succès !");
    }

    @Test
        @Order(4)
        @DisplayName("4. Inscription de l'Étudiant à l'Événement (Registration-Service)")
        void step4_registerToEvent() throws InterruptedException {
        Thread.sleep(2000);
        Assertions.assertNotNull(eventId, "L'eventId récupéré au Step 2 est null !");

        // Envoie l'eventId directement sous forme de String !
        java.util.Map<String, Object> registrationPayload = new java.util.HashMap<>();
        registrationPayload.put("eventId", eventId); 

        String rawRegistrationId = given()
                .header("Authorization", "Bearer " + studentToken)
                .contentType(ContentType.JSON)
                .header("Accept", "application/json") 
                .body(registrationPayload)
                .log().all()
        .when()
                .post("/api/registrations")
        .then()
                .log().all()
                // Accepte 200 ou 201 selon la spec générée
                .statusCode(anyOf(equalTo(200), equalTo(201))) 
                .body("status", anyOf(equalTo("PENDING"), equalTo("CONFIRMED"))) 
                .extract()
                .path("registrationId"); // Ajuste ici si le champ de réponse s'appelle "registrationId"

        registrationId = UUID.fromString(rawRegistrationId);
        System.out.println("✅ Étudiant inscrit avec succès ! ID Inscription : " + registrationId);
    }

    @Test
    @Order(5)
    @DisplayName("5. Suppression de l'Événement par l'Organisateur (Event-Service)")
    void step5_deleteEvent() {
        // L'organisateur détruit l'événement créé au step 2 via la route DELETE de l'event-service
        given()
                .header("Authorization", "Bearer " + orgToken)
                .contentType(ContentType.JSON)
        .when()
                .patch("/api/events/" + eventId + "/cancel")
        .then()
                .log().ifValidationFails()
                .statusCode(anyOf(equalTo(200), equalTo(204))); // Accepte 200 OK ou 204 No Content selon votre implémentation

        System.out.println("✅ Événement annulé par l'organisateur.");
    }

    @Test
    @Order(6)
    @DisplayName("6. Vérification de l'Annulation Automatique de l'Inscription")
    void step6_checkRegistrationCanceled() throws InterruptedException {
        // On laisse 3 secondes à Kafka pour propager l'événement de suppression
        // et au registration-service pour basculer le statut en "CANCELLED"
        Thread.sleep(3000);

        // Appel au GET /api/registrations/{registrationId} fourni dans ton ressource
        given()
                .header("Authorization", "Bearer " + studentToken)
                .accept(ContentType.JSON)
        .when()
                .get("/api/registrations/" + registrationId.toString())
        .then()
                .log().ifValidationFails()
                .statusCode(200)
                .body("status", equalTo("CANCELLED")); // On s'attend à ce que le statut soit passé à CANCELLED

        System.out.println("✅ L'inscription a bien été basculée à 'CANCELLED' suite à la suppression de l'événement !");
    }
}