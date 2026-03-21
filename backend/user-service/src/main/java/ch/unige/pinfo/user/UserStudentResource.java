package ch.unige.pinfo.user;

import ch.unige.pinfo.user.openapi.api.StudentsApi;
import ch.unige.pinfo.user.openapi.model.StudentProfile;
import ch.unige.pinfo.user.openapi.model.StudentProfileUpdate;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.util.UUID;

@Path("/api/users/{userId}/student-profile")
public class UserStudentResource implements StudentsApi {

    @Override
    public StudentProfile apiUsersUserIdStudentProfileGet(UUID userId) {
        User user = User.findById(UserResource.toLongId(userId));
        if (user == null) {
            throw new NotFoundException();
        }

        return new StudentProfile()
                .userId(userId)
                .faculty("Unknown")
                .major("Unknown")
                .degreeLevel(StudentProfile.DegreeLevelEnum.BACHELOR);
    }

    @Override
    public StudentProfile apiUsersUserIdStudentProfilePut(UUID userId, StudentProfileUpdate studentProfileUpdate) {
        User user = User.findById(UserResource.toLongId(userId));
        if (user == null) {
            throw new NotFoundException();
        }

        StudentProfile.DegreeLevelEnum degree = StudentProfile.DegreeLevelEnum.BACHELOR;
        if (studentProfileUpdate.getDegreeLevel() != null) {
            degree = StudentProfile.DegreeLevelEnum.fromValue(studentProfileUpdate.getDegreeLevel().toString());
        }

        return new StudentProfile()
                .userId(userId)
                .faculty(studentProfileUpdate.getFaculty() == null ? "Unknown" : studentProfileUpdate.getFaculty())
                .major(studentProfileUpdate.getMajor() == null ? "Unknown" : studentProfileUpdate.getMajor())
                .degreeLevel(degree);
    }
}
