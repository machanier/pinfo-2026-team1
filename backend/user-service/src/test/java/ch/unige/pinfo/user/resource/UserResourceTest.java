package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
public class UserResourceTest {

    @InjectMock
    UserRepository userRepository;

    @InjectMock
    JsonWebToken jwt;

    private User makeUser(String auth0Id, String email, String name, String role) {
        User u = new User();
        u.auth0Id = auth0Id;
        u.setEmail(email);
        u.setName(name);
        u.setRole(role);
        return u;
    }

    @SuppressWarnings("unchecked")
    private PanacheQuery<User> mockQuery(Optional<User> result) {
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(query.firstResultOptional()).thenReturn(result);
        return query;
    }

    @BeforeEach
    void setUp() {
        when(jwt.getSubject()).thenReturn("auth0|current");
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(List.of("Admin"));
    }

    // ─── GET /api/users ───────────────────────────────────────────────────────

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testGetAll_returnsListOfUsers() {
        User u1 = makeUser("auth0|current", "admin@unige.ch", "Admin", "Admin");
        User u2 = makeUser("auth0|other", "user@unige.ch", "User", "Student");

        when(userRepository.listAll()).thenReturn(List.of(u1, u2));

        given()
                .when().get("/api/users")
                .then()
                .statusCode(200)
                .body("$.size()", is(2))
                .body("[0].email", is("admin@unige.ch"));
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testGetAll_setsRoleFromJwtForCurrentUser() {
        User u = makeUser("auth0|current", "admin@unige.ch", "Admin", "Student");
        when(userRepository.listAll()).thenReturn(List.of(u));

        given()
                .when().get("/api/users")
                .then()
                .statusCode(200)
                .body("[0].role", is("Admin"));
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "student", roles = "Student")
    void testGetAll_forbiddenWithoutAdminRole() {
        given()
                .when().get("/api/users")
                .then()
                .statusCode(403);
    }

    // ─── GET /api/users/{auth0Id} ─────────────────────────────────────────────

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testGetByAuth0Id_returnsUser() {
        User u = makeUser("auth0|abc", "test@unige.ch", "Test", "Student");
        @SuppressWarnings("unchecked")
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(userRepository.find(User.AUTH0_ID_FIELD, "auth0|abc")).thenReturn(query);
        when(query.firstResultOptional()).thenReturn(Optional.of(u));

        given()
                .when().get("/api/users/auth0|abc")
                .then()
                .statusCode(200)
                .body("email", is("test@unige.ch"));
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testGetByAuth0Id_notFound() {
        @SuppressWarnings("unchecked")
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(userRepository.find(User.AUTH0_ID_FIELD, "auth0|unknown")).thenReturn(query);
        when(query.firstResultOptional()).thenReturn(Optional.empty());

        given()
                .when().get("/api/users/auth0|unknown")
                .then()
                .statusCode(404);
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "auth0|current", roles = "Admin")
    void testGetByAuth0Id_setsRoleFromJwtIfCurrentUser() {
        User u = makeUser("auth0|current", "me@unige.ch", "Me", "Student");
        PanacheQuery<User> query = mockQuery(Optional.of(u));
        when(userRepository.find(User.AUTH0_ID_FIELD, "auth0|current")).thenReturn(query);

        given()
                .when().get("/api/users/{id}", "auth0|current") // laisser RestAssured encoder
                .then()
                .statusCode(200);
    }

    // ─── POST /api/users ──────────────────────────────────────────────────────

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testCreateUser_success() {
        @SuppressWarnings("unchecked")
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(userRepository.find(User.AUTH0_ID_FIELD, "auth0|new")).thenReturn(query);
        when(query.firstResultOptional()).thenReturn(Optional.empty());

        given()
                .contentType(ContentType.JSON)
                .body("{\"auth0Id\": \"auth0|new\", \"email\": \"new@unige.ch\"}")
                .when().post("/api/users")
                .then()
                .statusCode(201)
                .body("email", is("new@unige.ch"))
                .body("role", is("User"));
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testCreateUser_missingAuth0Id() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"email\": \"new@unige.ch\"}")
                .when().post("/api/users")
                .then()
                .statusCode(400)
                .body(containsString("auth0Id is required"));
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testCreateUser_missingEmail() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"auth0Id\": \"auth0|new\"}")
                .when().post("/api/users")
                .then()
                .statusCode(400)
                .body(containsString("email is required"));
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testCreateUser_conflict() {
        User existing = makeUser("auth0|dup", "dup@unige.ch", "Dup", "Student");
        @SuppressWarnings("unchecked")
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(userRepository.find(User.AUTH0_ID_FIELD, "auth0|dup")).thenReturn(query);
        when(query.firstResultOptional()).thenReturn(Optional.of(existing));

        given()
                .contentType(ContentType.JSON)
                .body("{\"auth0Id\": \"auth0|dup\", \"email\": \"dup@unige.ch\"}")
                .when().post("/api/users")
                .then()
                .statusCode(409)
                .body(containsString("already exists"));
    }

    // ─── PUT /api/users/{auth0Id} ─────────────────────────────────────────────

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testUpdateUser_success() {
        User existing = makeUser("auth0|upd", "old@unige.ch", "Old", "Student");
        PanacheQuery<User> query = mockQuery(Optional.of(existing));
        when(userRepository.find(User.AUTH0_ID_FIELD, "auth0|upd")).thenReturn(query);

        given()
                .contentType(ContentType.JSON)
                .body("{\"email\": \"new@unige.ch\", \"name\": \"New Name\"}")
                .when().put("/api/users/{id}", "auth0|upd")
                .then()
                .statusCode(200)
                .body("email", is("new@unige.ch"))
                .body("name", is("New Name"));
    }

    @Test
    @io.quarkus.test.security.TestSecurity(user = "admin", roles = "Admin")
    void testUpdateUser_notFound() {
        @SuppressWarnings("unchecked")
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(userRepository.find(User.AUTH0_ID_FIELD, "auth0|ghost")).thenReturn(query);
        when(query.firstResultOptional()).thenReturn(Optional.empty());

        given()
                .contentType(ContentType.JSON)
                .body("{\"email\": \"ghost@unige.ch\"}")
                .when().put("/api/users/auth0|ghost")
                .then()
                .statusCode(404)
                .body(containsString("User not found"));
    }
}