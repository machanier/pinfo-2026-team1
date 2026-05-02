package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.service.UserSyncService;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@QuarkusTest
class CurrentUserResourceTest {

    @InjectMock
    UserRepository userRepository;

    @InjectMock
    JsonWebToken jwt;

    @InjectMock
    UserSyncService userSyncService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String AUTH0_ID = "auth0|me-123";

    @SuppressWarnings("unchecked")
    private PanacheQuery<User> mockQuery(Optional<User> result) {
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(query.firstResultOptional()).thenReturn(result);
        return query;
    }

    @BeforeEach
    void setUp() {
        doNothing().when(userSyncService).syncUser();
    }

    @Test
    @TestSecurity(user = AUTH0_ID, roles = "Student")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ID) })
    void me_missingSubject_returns401() {
        when(jwt.getSubject()).thenReturn(" ");

        given()
                .when().get("/api/users/me")
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = AUTH0_ID, roles = "Student")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ID) })
    void me_userNotFound_returns404() {
        when(jwt.getSubject()).thenReturn(AUTH0_ID);
        PanacheQuery<User> query = mockQuery(Optional.empty());
        when(userRepository.find("auth0Id", AUTH0_ID)).thenReturn(query);

        given()
                .when().get("/api/users/me")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ID, roles = "Student")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ID) })
    void me_inactiveUser_returns404() {
        when(jwt.getSubject()).thenReturn(AUTH0_ID);
        User inactive = new User();
        inactive.id = USER_ID;
        inactive.auth0Id = AUTH0_ID;
        inactive.active = false;
        PanacheQuery<User> query = mockQuery(Optional.of(inactive));
        when(userRepository.find("auth0Id", AUTH0_ID)).thenReturn(query);

        given()
                .when().get("/api/users/me")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_ID, roles = "Student")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ID) })
    void me_activeUser_returns200() {
        when(jwt.getSubject()).thenReturn(AUTH0_ID);
        User user = new User();
        user.id = USER_ID;
        user.auth0Id = AUTH0_ID;
        user.active = true;
        user.setName("Alice");
        user.setEmail("alice@unige.ch");
        user.avatarUrl = "https://example.com/avatar.png";
        PanacheQuery<User> query = mockQuery(Optional.of(user));
        when(userRepository.find("auth0Id", AUTH0_ID)).thenReturn(query);

        given()
                .when().get("/api/users/me")
                .then()
                .statusCode(200)
                .body("id", equalTo(USER_ID.toString()))
                .body("name", equalTo("Alice"))
                .body("email", equalTo("alice@unige.ch"))
                .body("avatarUrl", equalTo("https://example.com/avatar.png"));
    }

    @Test
    @TestSecurity(user = AUTH0_ID, roles = "Student")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_ID) })
    void me_activeUserWithNullRole_defaultsToStudent() {
        when(jwt.getSubject()).thenReturn(AUTH0_ID);
        User user = new User();
        user.id = USER_ID;
        user.auth0Id = AUTH0_ID;
        user.active = true;
        user.setName("Alice");
        user.setEmail("alice@unige.ch");
        user.avatarUrl = null;
        user.role = null;
        PanacheQuery<User> query = mockQuery(Optional.of(user));
        when(userRepository.find("auth0Id", AUTH0_ID)).thenReturn(query);

        given()
                .when().get("/api/users/me")
                .then()
                .statusCode(200)
                .body("role", equalTo("STUDENT"));
    }
}
