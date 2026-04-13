package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.Student;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.openapi.api.InternalApi;
import ch.unige.pinfo.user.openapi.model.EligibilityAttributes;
import ch.unige.pinfo.user.openapi.model.InternalUsersUserIdExistsGet200Response;
import ch.unige.pinfo.user.openapi.model.UserRole;
import ch.unige.pinfo.user.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.UUID;

@Path("/internal/users/{userId}")
public class InternalResource implements InternalApi {

    private final UserRepository userRepository;

    // Injecte le internal service key stocker dans le fichier de config
    // application.properties
    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    @Inject
    public InternalResource(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public InternalUsersUserIdExistsGet200Response internalUsersUserIdExistsGet(
            @PathParam("userId") UUID userId) {

        User user = userRepository.findById(userId);

        InternalUsersUserIdExistsGet200Response response = new InternalUsersUserIdExistsGet200Response();

        if (user == null || !user.isActive()) {
            response.setExists(false);
            return response;
        }

        response.setExists(true);
        response.setRole(UserRole.fromValue(user.getRole().toUpperCase()));
        return response;
    }

    @Override
    public EligibilityAttributes internalUsersUserIdEligibilityGet(
            @PathParam("userId") UUID userId) {

        User user = userRepository.findById(userId);

        if (!(user instanceof Student student) || !student.isActive()) {
            throw new NotFoundException("User not found or user is not a student");
        }

        return new EligibilityAttributes()
                .userId(student.getId())
                .faculty(student.getFaculty())
                .major(student.getMajor())
                .degreeLevel(EligibilityAttributes.DegreeLevelEnum.valueOf(
                        student.getDegreeLevel().name()));
    }
}