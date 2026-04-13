package ch.unige.pinfo.user.resource;

import java.util.UUID;

import ch.unige.pinfo.user.model.DegreeLevel;
import ch.unige.pinfo.user.model.Student;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.openapi.api.StudentsApi;
import ch.unige.pinfo.user.openapi.model.StudentProfile;
import ch.unige.pinfo.user.openapi.model.StudentProfileUpdate;
import ch.unige.pinfo.user.repository.UserRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users/{userId}/student-profile")
public class StudentResource implements StudentsApi {

    private final UserRepository userRepository;
    private final JsonWebToken jwt;

    @Inject
    public StudentResource(UserRepository userRepository, JsonWebToken jwt) {
        this.userRepository = userRepository;
        this.jwt = jwt;
    }

    @Override
    public StudentProfile apiUsersUserIdStudentProfileGet(@PathParam("userId") UUID userId) {
        return toStudentProfile(getStudentOrThrow(userId));
    }

    @Override
    @Transactional
    @RolesAllowed({ "Student", "Admin" })
    public StudentProfile apiUsersUserIdStudentProfilePut(@PathParam("userId") UUID userId,
            @Valid @NotNull StudentProfileUpdate studentProfileUpdate) {
        Student student = getStudentOrThrow(userId);

        if (!student.getAuth0Id().equals(jwt.getSubject())) {
            throw new ForbiddenException("Can only update own profile");
        }

        student.setFaculty(studentProfileUpdate.getFaculty());
        student.setMajor(studentProfileUpdate.getMajor());
        student.setDegreeLevel(DegreeLevel.valueOf(studentProfileUpdate.getDegreeLevel().name()));
        userRepository.persist(student);

        return toStudentProfile(student);
    }

    // Trouve l'étudiant dans la base de données
    private Student getStudentOrThrow(UUID userId) {
        User user = userRepository.findById(userId);
        if (!(user instanceof Student student)) {
            throw new NotFoundException("User not found or user is not a student: " + userId);
        }
        return student;
    }

    // Conversion de entité Student à DTO StudentProfile
    private StudentProfile toStudentProfile(Student student) {
        return new StudentProfile()
                .userId(student.id)
                .faculty(student.faculty)
                .major(student.major)
                .degreeLevel(StudentProfile.DegreeLevelEnum.valueOf(student.degreeLevel.name()));
    }
}
