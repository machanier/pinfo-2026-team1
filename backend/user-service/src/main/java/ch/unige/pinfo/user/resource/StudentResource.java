package ch.unige.pinfo.user.resource;

import java.util.UUID;

import ch.unige.pinfo.user.model.DegreeLevel;
import ch.unige.pinfo.user.model.Student;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.openapi.api.StudentsApi;
import ch.unige.pinfo.user.openapi.model.StudentProfile;
import ch.unige.pinfo.user.openapi.model.StudentProfileUpdate;
import ch.unige.pinfo.user.repository.UserRepository;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users/{userId}/student-profile")
public class StudentResource implements StudentsApi {

    private final UserRepository userRepository;
    private final JsonWebToken jwt;
    private final SecurityIdentity securityIdentity;

    @Inject
    public StudentResource(UserRepository userRepository, JsonWebToken jwt, SecurityIdentity securityIdentity) {
        this.userRepository = userRepository;
        this.jwt = jwt;
        this.securityIdentity = securityIdentity;
    }

    @Override
    @RolesAllowed({ "STUDENT", "ADMIN" })
    public StudentProfile apiUsersUserIdStudentProfileGet(@PathParam("userId") UUID userId) {
        Student student = getStudentOrThrow(userId);

        // IDOR fix (same model as UserResource.apiUsersUserIdGet, PINFO-193): a
        // student's academic profile (faculty/major/degree) is personal data. Only
        // the owner or an Admin may read it — mirroring the PUT below. Without this,
        // any authenticated user could enumerate UUIDs and read anyone's profile.
        if (!securityIdentity.hasRole("ADMIN") && !student.getAuth0Id().equals(jwt.getSubject())) {
            throw new ForbiddenException("Cannot read another user's student profile");
        }

        return toStudentProfile(student);
    }

    @Override
    @Transactional
    @RolesAllowed({ "STUDENT", "ADMIN" })
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
        if (user == null || !user.isActive() || !(user instanceof Student student)) {
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
