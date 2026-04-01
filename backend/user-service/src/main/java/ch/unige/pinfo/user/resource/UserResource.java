package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.openapi.api.UsersApi;
import ch.unige.pinfo.user.openapi.model.UpdateUserRequest;
import ch.unige.pinfo.user.openapi.model.UserResponse;
import ch.unige.pinfo.user.openapi.model.UserRole;
import ch.unige.pinfo.user.repository.UserRepository;
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

    @Inject
    public UserResource(UserRepository userRepository, JsonWebToken jwt) {
        this.userRepository = userRepository;
        this.jwt = jwt;
    }

    @Override
    @Transactional
    @RolesAllowed({ "Student", "Organizer", "Admin" })
    public void apiUsersUserIdDelete(@PathParam("userId") UUID userId) {
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new NotFoundException("User not found: " + userId);
        }

        // Admin can delete anyone; others can only delete themselves
        String callerRole = getRoleFromJwt();
        boolean isAdmin = "Admin".equals(callerRole);
        boolean isOwner = user.auth0Id.equals(jwt.getSubject());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Can only deactivate own account");
        }

        // spec says it is a soft delete
        user.active = false;
        userRepository.persist(user);
    }

    @Override
    public UserResponse apiUsersUserIdGet(@PathParam("userId") UUID userId) {
        User user = userRepository.findById(userId);
        if (user == null) {
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

        // ownership check. Adaptation from auth0id to UUID model
        if (!user.auth0Id.equals(jwt.getSubject())) {
            throw new ForbiddenException("Cannot update another user's profile");
        }

        if (req.getName() != null)
            user.name = req.getName();

        userRepository.persist(user);
        return toResponse(user);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    /*
     * this mehthod is kept in the resource for now but should eventually move it
     * to a shared JwtService bean once more resources need it: the StudentProfile
     * and AssociationProfile resources will need the same logic.
     */
    private String getRoleFromJwt() {
        Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");
        if (rolesClaim instanceof java.util.Collection<?> roles && !roles.isEmpty()) {
            Object first = roles.iterator().next();
            return (first != null) ? first.toString().replace("\"", "") : "User";
        }
        return "User";
    }

    // Maps the entity to the generated DTO — keeps entity internals private
    /*
     * toResponse() is the only place that touches the generated DTO — this is
     * important.
     * Never let the raw User entity leak out of the resource layer, because the
     * generated
     * model will change whenever the spec changes, and you want that impact
     * contained to one method.
     */
    private UserResponse toResponse(User user) {
        return new UserResponse()
                .id(user.id)
                .name(user.name)
                .email(user.email)
                .avatarUrl(user.avatarUrl != null ? java.net.URI.create(user.avatarUrl) : null)
                .role(UserRole.fromValue(user.role != null ? user.role.toUpperCase() : "STUDENT"))
                .createdAt(user.createdAt);
    }
}