package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.openapi.model.UserResponse;
import ch.unige.pinfo.user.openapi.model.UserRole;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.service.UserSyncService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Optional;

@Path("/api/users/me")
public class CurrentUserResource {

    private final UserRepository userRepository;
    private final UserSyncService userSyncService;
    private final JsonWebToken jwt;

    @Inject
    public CurrentUserResource(UserRepository userRepository, UserSyncService userSyncService, JsonWebToken jwt) {
        this.userRepository = userRepository;
        this.userSyncService = userSyncService;
        this.jwt = jwt;
    }

    @GET
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public UserResponse me() {
        userSyncService.syncUser();

        String auth0Id = jwt.getSubject();
        if (auth0Id == null || auth0Id.isBlank()) {
            throw new NotAuthorizedException("Missing JWT subject");
        }

        Optional<User> user = userRepository.find("auth0Id", auth0Id).firstResultOptional();
        if (user.isEmpty() || !user.get().active) {
            throw new NotFoundException("Current user not provisioned for subject: " + auth0Id);
        }

        return toResponse(user.get());
    }

    private UserResponse toResponse(User user) {
        return new UserResponse()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(AvatarUriHelper.safeAvatarUri(user.avatarUrl))
                .role(UserRole.fromValue(user.role != null ? user.getRole().toUpperCase() : "STUDENT"))
                .createdAt(user.getCreatedAt());
    }
}
