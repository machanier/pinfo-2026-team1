package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.openapi.api.UsersApi;
import ch.unige.pinfo.user.openapi.model.UpdateUserRequest;
import ch.unige.pinfo.user.openapi.model.UserResponse;
import ch.unige.pinfo.user.openapi.model.UserRole;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.service.UserSyncService;
import ch.unige.pinfo.user.model.User;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.annotation.security.RolesAllowed;
import java.util.UUID;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users/{userId}")
public class UserResource implements UsersApi {

    private final UserRepository userRepository;
    private final JsonWebToken jwt;
    private final UserSyncService userSyncService;

    @Inject
    public UserResource(UserRepository userRepository, JsonWebToken jwt, UserSyncService userSyncService) {
        this.userRepository = userRepository;
        this.jwt = jwt;
        this.userSyncService = userSyncService;
    }

    @Override
    @Transactional
    @RolesAllowed({ "Student", "Organizer", "Admin" })
    public void apiUsersUserIdDelete(@PathParam("userId") UUID userId) {
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new NotFoundException("User not found: " + userId);
        }

        // Admin peut supprimer n'import qui, les autres ne peuvent que supprimer leur
        // propre compte
        String callerRole = userSyncService.getRoleFromJwt();
        boolean isAdmin = "Admin".equals(callerRole);
        boolean isOwner = user.auth0Id.equals(jwt.getSubject());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Can only deactivate own account unless Admin role");
        }

        // soft delete
        user.active = false;
        userRepository.persist(user);
    }

    @Override
    public UserResponse apiUsersUserIdGet(@PathParam("userId") UUID userId) {
        User user = userRepository.findById(userId);
        if (user == null || !user.active) {
            throw new NotFoundException("User not found: " + userId);
        }
        return toResponse(user);
    }

    @Override
    @Transactional
    @RolesAllowed({ "Student", "Organizer", "Admin" })
    public UserResponse apiUsersUserIdPut(@PathParam("userId") UUID userId, UpdateUserRequest req) {
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new NotFoundException("User not found: " + userId);
        }

        if (!user.auth0Id.equals(jwt.getSubject())) {
            throw new ForbiddenException("Cannot update another user's profile");
        }

        if (req.getName() != null)
            user.name = req.getName();

        userRepository.persist(user);
        return toResponse(user);
    }

    // Conversion de entité User à DTO UserReponse
    private UserResponse toResponse(User user) {
        return new UserResponse()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(user.avatarUrl != null ? java.net.URI.create(user.getAvatarUrl()) : null)
                .role(UserRole.fromValue(user.role != null ? user.getRole().toUpperCase() : "STUDENT"))
                .createdAt(user.getCreatedAt());
    }
}