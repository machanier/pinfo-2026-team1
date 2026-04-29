package ch.unige.pinfo.user.security;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.service.UserSyncService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
class InternalServiceKeyFilterTest {

    @InjectMock
    UserRepository userRepository;

    @InjectMock
    UserSyncService userSyncService;

    private static final String VALID_KEY = "test-internal-key";

    private User makeUser(String auth0Id, String role) {
        User u = new User();
        u.auth0Id = auth0Id;
        u.setName("Test");
        u.setEmail("test@unige.ch");
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        doNothing().when(userSyncService).syncUser();
    }

    @Test
    @TestSecurity(user = "auth0|123", roles = "Student")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = "auth0|123")
    })
    void publicEndpoint_noServiceKey_isNotRejected() {
        when(userRepository.findById(any(UUID.class))).thenReturn(makeUser("auth0|123", "STUDENT"));

        given()
                .when().get("/api/users/{id}", UUID.randomUUID())
                .then()
                .statusCode(200);
    }

    @Test
    @TestSecurity(user = "auth0|123", roles = "Student")
    @JwtSecurity(claims = {
            @Claim(key = "sub", value = "auth0|123")
    })
    void publicEndpoint_withServiceKey_isNotAffected() {
        when(userRepository.findById(any(UUID.class))).thenReturn(makeUser("auth0|123", "STUDENT"));

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/api/users/{id}", UUID.randomUUID())
                .then()
                .statusCode(200);
    }

    @Test
    void internalEndpoint_noServiceKey_isRejected() {
        given()
                .when().get("/internal/users/{id}/exists", UUID.randomUUID())
                .then()
                .statusCode(401);
    }

    @Test
    void internalEndpoint_validServiceKey_isNotRejected() {
        when(userRepository.findById(any(UUID.class))).thenReturn(null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/exists", UUID.randomUUID())
                .then()
                .statusCode(200);
    }

    @Test
    void internalEndpoint_invalidServiceKey_isRejected() {
        given()
                .header("X-Internal-Service-Key", "wrong-key")
                .when().get("/internal/users/{id}/exists", UUID.randomUUID())
                .then()
                .statusCode(401);
    }

    @Test
    void internalEndpoint_emptyServiceKey_isRejected() {
        given()
                .header("X-Internal-Service-Key", "")
                .when().get("/internal/users/{id}/exists", UUID.randomUUID())
                .then()
                .statusCode(401);
    }
}