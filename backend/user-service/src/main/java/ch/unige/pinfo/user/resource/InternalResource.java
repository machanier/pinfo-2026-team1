package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.Student;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.openapi.api.InternalApi;
import ch.unige.pinfo.user.openapi.model.EligibilityAttributes;
import ch.unige.pinfo.user.openapi.model.InternalUserContact;
import ch.unige.pinfo.user.openapi.model.InternalUsersUserIdExistsGet200Response;
import ch.unige.pinfo.user.openapi.model.UserRole;
import ch.unige.pinfo.user.repository.UserRepository;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.UUID;

@Path("/internal")
public class InternalResource implements InternalApi {

    private final UserRepository userRepository;

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    @Inject
    public InternalResource(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 2. On spécifie le chemin complet de la ressource pour l'existence
    @GET
    @Path("/users/{userId}/exists")
    // Note : Ajuste le chemin exact /exists selon ce qui est généré par ton
    // InternalApi
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

    // 3. On spécifie le chemin complet pour l'éligibilité
    @GET
    @Path("/users/{userId}/eligibility")
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

    @Override
    @GET
    @Path("/users/{userId}/contact")
    public InternalUserContact internalUsersUserIdContactGet(@PathParam("userId") UUID userId) {
        User user = userRepository.findById(userId);

        if (user == null || !user.isActive()) {
            throw new NotFoundException("User not found");
        }

        return new InternalUserContact()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail());
    }
}