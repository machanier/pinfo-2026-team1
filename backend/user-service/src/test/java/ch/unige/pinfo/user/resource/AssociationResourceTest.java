package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.Association;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import io.restassured.http.ContentType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.when;

@QuarkusTest
class AssociationResourceTest {

    @InjectMock
    UserRepository userRepository;

    @InjectMock
    JsonWebToken jwt;

    private static final UUID ASSOCIATION_ID = UUID.randomUUID();
    private static final String AUTH0_ASSOCIATION = "auth0|association-123";
    private static final String AUTH0_OTHER = "auth0|other-456";

    private Association makeAssociation(UUID id, String auth0Id) {
        Association a = new Association();
        a.id = id;
        a.auth0Id = auth0Id;
        a.setDescription("We are a student tech club.");
        return a;
    }

    // ── GET /api/users/{userId}/association-profile ──────────────────────

    @Test
    void getAssociationProfile_existingAssociation_returns200() {
        Association association = makeAssociation(ASSOCIATION_ID, AUTH0_ASSOCIATION);
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(association);

        given()
                .when().get("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(200)
                .body("userId", equalTo(ASSOCIATION_ID.toString()))
                .body("description", equalTo("We are a student tech club."));
    }

    @Test
    void getAssociationProfile_userIsNotAssociation_returns404() {
        User regularUser = new User();
        regularUser.id = ASSOCIATION_ID;
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(regularUser);

        given()
                .when().get("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(404);
    }

    @Test
    void getAssociationProfile_nonExistentUser_returns404() {
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(null);

        given()
                .when().get("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(404);
    }

    // ── PUT /api/users/{userId}/association-profile ──────────────────────

    @Test
    @TestSecurity(user = AUTH0_ASSOCIATION, roles = "Association")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ASSOCIATION) })
    void updateAssociationProfile_asOwner_returns200() {
        Association association = makeAssociation(ASSOCIATION_ID, AUTH0_ASSOCIATION);
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(association);
        when(jwt.getSubject()).thenReturn(AUTH0_ASSOCIATION);

        String updateJson = """
                {
                    "description": "Updated tech club description."
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(updateJson)
                .when().put("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(200)
                .body("description", equalTo("Updated tech club description."));
    }

    @Test
    @TestSecurity(user = AUTH0_OTHER, roles = "Association")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_OTHER) })
    void updateAssociationProfile_asNonOwner_returns403() {
        Association association = makeAssociation(ASSOCIATION_ID, AUTH0_ASSOCIATION);
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(association);
        when(jwt.getSubject()).thenReturn(AUTH0_OTHER);

        given()
                .contentType(ContentType.JSON)
                .body("{\"description\": \"Hacked description\"}")
                .when().put("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = AUTH0_ASSOCIATION, roles = "Association")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ASSOCIATION) })
    void updateAssociationProfile_missingDescription_returns400() {
        Association association = makeAssociation(ASSOCIATION_ID, AUTH0_ASSOCIATION);
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(association);
        when(jwt.getSubject()).thenReturn(AUTH0_ASSOCIATION);

        String invalidJson = "{}"; // description nulle

        given()
                .contentType(ContentType.JSON)
                .body(invalidJson)
                .when().put("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(400);
    }

    @Test
    void updateAssociationProfile_noAuth_returns401() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"description\": \"Updated description\"}")
                .when().put("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(401);
    }

    @Test
    void getAssociationProfile_userNotFound_throws404() {
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(null);

        given()
                .when().get("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(404);
    }

    @Test
    void getAssociationProfile_nonOrganizerUser_returns404() {
        User student = new User();
        student.id = ASSOCIATION_ID;
        student.setRole("student");

        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(student);

        given()
                .when().get("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ASSOCIATION, roles = "Association")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ASSOCIATION) })
    void updateAssociationProfile_validData_updates() {
        Association association = makeAssociation(ASSOCIATION_ID, AUTH0_ASSOCIATION);
        when(userRepository.findById(ASSOCIATION_ID)).thenReturn(association);
        when(jwt.getSubject()).thenReturn(AUTH0_ASSOCIATION);

        given()
                .contentType(ContentType.JSON)
                .body("{\"description\": \"New description\"}")
                .when().put("/api/users/{id}/association-profile", ASSOCIATION_ID)
                .then()
                .statusCode(200)
                .body("description", equalTo("New description"));
    }
}