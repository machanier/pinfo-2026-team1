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
    void getStudentProfile_existingStudent_returns200() {
        Student student = makeStudent(STUDENT_ID, AUTH0_STUDENT);
        when(userRepository.findById(STUDENT_ID)).thenReturn(student);

        given()
                .when().get("/api/users/{id}/student-profile", STUDENT_ID)
                .then()
                .statusCode(200)
                .body("faculty", equalTo("GSEM"))
                .body("major", equalTo("SINF"))
                .body("degreeLevel", equalTo("BACHELOR"));
    }

    @Test
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
    void getStudentProfile_userIsNotStudent_returns404() {
        User regularUser = new User();
        regularUser.id = STUDENT_ID;
        when(userRepository.findById(STUDENT_ID)).thenReturn(regularUser);

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
                .body("degreeLevel", equalTo("MASTER"));
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