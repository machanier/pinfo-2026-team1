package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.Student;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.model.DegreeLevel;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.service.UserSyncService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
class InternalResourceTest {

    @InjectMock
    UserRepository userRepository;

    @InjectMock
    UserSyncService userSyncService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String VALID_KEY = "test-internal-key";

    private User makeUser(String auth0Id, String role) {
        User u = new User();
        u.id = USER_ID;
        u.auth0Id = auth0Id;
        u.setRole(role);
        u.setName("Test User");
        u.setEmail("test@unige.ch");
        return u;
    }

    private Student makeStudent(String auth0Id) {
        Student s = new Student();
        s.id = USER_ID;
        s.auth0Id = auth0Id;
        s.setRole("Student");
        s.setName("Test Student");
        s.setEmail("student@unige.ch");
        s.setFaculty("Science");
        s.setMajor("Computer Science");
        s.setDegreeLevel(DegreeLevel.BACHELOR);
        return s;
    }

    @BeforeEach
    void setUp() {
        doNothing().when(userSyncService).syncUser();
    }

    // ── GET /internal/users/{userId}/exists ───────────────────────────────

    @Test
    void exists_validKeyAndExistingUser_returns200() {
        when(userRepository.findById(USER_ID)).thenReturn(makeUser("auth0|123", "Student"));

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/exists", USER_ID)
                .then()
                .statusCode(200)
                .body("exists", equalTo(true))
                .body("role", equalTo("STUDENT"));
    }

    @Test
    void exists_validKeyAndNonExistentUser_returnsFalse() {
        when(userRepository.findById(any(UUID.class))).thenReturn(null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/exists", UUID.randomUUID())
                .then()
                .statusCode(200)
                .body("exists", equalTo(false));
    }

    @Test
    void exists_validKeyAndInactiveUser_returnsFalse() {
        User user = makeUser("auth0|123", "Student");
        user.setActive(false);
        when(userRepository.findById(USER_ID)).thenReturn(user);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/exists", USER_ID)
                .then()
                .statusCode(200)
                .body("exists", equalTo(false));
    }

    @Test
    void exists_invalidKey_returns401() {
        given()
                .header("X-Internal-Service-Key", "wrong-key")
                .when().get("/internal/users/{id}/exists", USER_ID)
                .then()
                .statusCode(401);
    }

    @Test
    void exists_missingKey_returns401() {
        given()
                .when().get("/internal/users/{id}/exists", USER_ID)
                .then()
                .statusCode(401);
    }

    // ── GET /internal/users/{userId}/eligibility ──────────────────────────

    @Test
    void eligibility_validKeyAndStudent_returns200() {
        when(userRepository.findById(USER_ID)).thenReturn(makeStudent("auth0|123"));

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/eligibility", USER_ID)
                .then()
                .statusCode(200)
                .body("userId", equalTo(USER_ID.toString()))
                .body("faculty", equalTo("Science"))
                .body("major", equalTo("Computer Science"))
                .body("degreeLevel", equalTo("BACHELOR"));
    }

    @Test
    void eligibility_validKeyAndNonStudent_returns404() {
        when(userRepository.findById(USER_ID)).thenReturn(makeUser("auth0|123", "Organizer"));

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/eligibility", USER_ID)
                .then()
                .statusCode(404);
    }

    @Test
    void eligibility_validKeyAndNonExistentUser_returns404() {
        when(userRepository.findById(any(UUID.class))).thenReturn(null);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/eligibility", UUID.randomUUID())
                .then()
                .statusCode(404);
    }

    @Test
    void eligibility_validKeyAndInactiveStudent_returns404() {
        Student student = makeStudent("auth0|123");
        student.setActive(false);
        when(userRepository.findById(USER_ID)).thenReturn(student);

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/eligibility", USER_ID)
                .then()
                .statusCode(404);
    }

    @Test
    void eligibility_invalidKey_returns401() {
        given()
                .header("X-Internal-Service-Key", "wrong-key")
                .when().get("/internal/users/{id}/eligibility", USER_ID)
                .then()
                .statusCode(401);
    }

    @Test
    void eligibility_missingKey_returns401() {
        given()
                .when().get("/internal/users/{id}/eligibility", USER_ID)
                .then()
                .statusCode(401);
    }

    @Test
    void contact_validKeyAndExistingUser_returns200() {
        when(userRepository.findById(USER_ID)).thenReturn(makeUser("auth0|123", "Student"));

        given()
                .header("X-Internal-Service-Key", VALID_KEY)
                .when().get("/internal/users/{id}/contact", USER_ID)
                .then()
                .statusCode(200)
                .body("userId", equalTo(USER_ID.toString()))
                .body("name", equalTo("Test User"))
                .body("email", equalTo("test@unige.ch"));
    }
}