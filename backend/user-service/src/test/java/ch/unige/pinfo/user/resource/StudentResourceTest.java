package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.DegreeLevel;
import ch.unige.pinfo.user.model.Student;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class StudentResourceTest {

    @InjectMock
    UserRepository userRepository;

    @InjectMock
    JsonWebToken jwt;

    private static final UUID STUDENT_ID = UUID.randomUUID();
    private static final String AUTH0_STUDENT = "auth0|student-123";
    private static final String AUTH0_OTHER = "auth0|other-456";

    private Student makeStudent(UUID id, String auth0Id) {
        Student s = new Student();
        s.id = id;
        s.auth0Id = auth0Id;
        s.setFaculty("GSEM");
        s.setMajor("SINF");
        s.setDegreeLevel(DegreeLevel.BACHELOR);
        return s;
    }

    // ── GET /api/users/{userId}/student-profile ──────────────────────────

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void getStudentProfile_existingStudent_asOwner_returns200() {
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);
        when(jwt.getSubject()).thenReturn(AUTH0_STUDENT);

        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(200)
                .body("faculty", equalTo("GSEM"))
                .body("major", equalTo("SINF"))
                .body("degreeLevel", equalTo("BACHELOR"));
    }

    @Test
    @TestSecurity(user = AUTH0_OTHER, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_OTHER) })
    void getStudentProfile_asNonOwner_returns403() {
        // IDOR fix: a non-owner non-admin caller cannot read another student's
        // academic profile, even when authenticated.
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);
        when(jwt.getSubject()).thenReturn(AUTH0_OTHER);

        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = "auth0|admin-999", roles = "ADMIN")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|admin-999") })
    void getStudentProfile_asAdmin_returns200() {
        // Admin is the only escape hatch — may read any student's profile.
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);
        when(jwt.getSubject()).thenReturn("auth0|admin-999");

        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(200);
    }

    @Test
    void getStudentProfile_unauthenticated_returns401() {
        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void getStudentProfile_inactiveStudent_returns404() {
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        student.active = false;
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);

        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void getStudentProfile_userIsNotStudent_returns404() {
        User regularUser = new User();
        regularUser.id = STUDENT_ID;
        when(userRepository.findById(STUDENT_ID)).thenReturn(regularUser);

        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void getStudentProfile_missingUser_returns404() {
        when(userRepository.findById(STUDENT_ID)).thenReturn(null);

        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(404);
    }

    // ── PUT /api/users/{userId}/student-profile ──────────────────────────

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void updateStudentProfile_asOwner_returns200() {
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);
        when(jwt.getSubject()).thenReturn(AUTH0_STUDENT);

        String updateJson = """
                {
                    "faculty": "Sciences",
                    "major": "Computer Science",
                    "degreeLevel": "MASTER"
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(updateJson)
                .when().put("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(200)
                .body("faculty", equalTo("Sciences"))
                .body("major", equalTo("Computer Science"))
                .body("degreeLevel", equalTo("MASTER"));

        verify(userRepository, times(1)).persist(student);
    }

    @Test
    @TestSecurity(user = AUTH0_OTHER, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_OTHER) })
    void updateStudentProfile_asNonOwner_returns403() {
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);
        when(jwt.getSubject()).thenReturn(AUTH0_OTHER);

        given()
                .contentType(ContentType.JSON)
                .body("{\"faculty\": \"Hack\", \"major\": \"Hack\", \"degreeLevel\": \"MASTER\"}")
                .when().put("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(403);

        verify(userRepository, never()).persist(student);
    }

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void updateStudentProfile_missingFields_returns400() {
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);
        when(jwt.getSubject()).thenReturn(AUTH0_STUDENT);

        // Missing degreeLevel
        String invalidJson = "{\"faculty\": \"Sciences\", \"major\": \"CS\"}";

        given()
                .contentType(ContentType.JSON)
                .body(invalidJson)
                .when().put("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(400);

        verify(userRepository, never()).persist(student);
    }

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void updateStudentProfile_inactiveStudent_returns404() {
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        student.active = false;
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);

        given()
                .contentType(ContentType.JSON)
                .body("{\"faculty\": \"Sciences\", \"major\": \"CS\", \"degreeLevel\": \"MASTER\"}")
                .when().put("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(404);

        verify(userRepository, never()).persist(student);
    }

    @Test
    @TestSecurity(user = AUTH0_STUDENT, roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = AUTH0_STUDENT) })
    void updateStudentProfile_userIsNotStudent_returns404() {
        User regularUser = new User();
        regularUser.id = STUDENT_ID;
        when(userRepository.findById(STUDENT_ID)).thenReturn(regularUser);

        given()
                .contentType(ContentType.JSON)
                .body("{\"faculty\": \"Sciences\", \"major\": \"CS\", \"degreeLevel\": \"MASTER\"}")
                .when().put("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(404);

        verify(userRepository, never()).persist(regularUser);
    }

    @Test
    void updateStudentProfile_noAuth_returns401() {
        given()
                .contentType(ContentType.JSON)
                .body("{}")
                .when().put("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(401);
    }
}