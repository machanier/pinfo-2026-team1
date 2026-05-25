package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.openapi.model.UpdateUserRequest;
import ch.unige.pinfo.user.openapi.model.UserResponse;
import ch.unige.pinfo.user.openapi.model.UserRole;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.service.UserSyncService;
import ch.unige.pinfo.user.model.User;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.annotation.security.RolesAllowed;
import java.util.UUID;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users") // Définition explicite et propre du path racine
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource { // <-- On retire temporairement "implements UsersApi" pour isoler le bug

    private final UserRepository userRepository;
    private final JsonWebToken jwt;
    private final UserSyncService userSyncService;

    @Inject
    public UserResource(UserRepository userRepository, JsonWebToken jwt, UserSyncService userSyncService) {
        this.userRepository = userRepository;
        this.jwt = jwt;
        this.userSyncService = userSyncService;
    }

    @GET
    @Path("/{userId}")
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public UserResponse apiUsersUserIdGet(@PathParam("userId") UUID userId) {
        User user = userRepository.findById(userId);
        if (user == null || !user.active) {
            throw new NotFoundException("User not found: " + userId);
        }

        String callerRole = userSyncService.getRoleFromJwt();
        boolean isAdmin = "ADMIN".equals(callerRole);
        boolean isOwner = user.auth0Id.equals(jwt.getSubject());
        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Cannot read another user's profile");
        }

        return toResponse(user);
    }

    @PUT
    @Path("/{userId}")
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public UserResponse apiUsersUserIdPut(@PathParam("userId") UUID userId, UpdateUserRequest req) {
        // 1. Recherche par la vraie clé unique fonctionnelle d'Auth0 issue du JWT
        String currentAuth0Id = jwt.getSubject();
        User user = userRepository.find("auth0Id", currentAuth0Id).firstResult();

        if (user == null) {
            // Mode Création (Première synchronisation)
            user = new User();

            user.auth0Id = currentAuth0Id;
            user.active = true;

            String callerRole = userSyncService.getRoleFromJwt();
            user.role = callerRole != null ? callerRole : "STUDENT";

            // Sécurité Email obligatoire (nullable = false)
            String tokenEmail = jwt.getClaim("https://unigevents.com/email");
            user.email = (tokenEmail != null) ? tokenEmail : (currentAuth0Id.replace("|", ".") + "@unigevents.local");
            user.name = (req.getName() != null) ? req.getName() : "Nouvel Utilisateur";

            // Note: On NE FAIT PAS user.setId(userId). On laisse Hibernate générer l'id
            // unique grâce à @GeneratedValue.
        } else {
            // Mode Mise à jour (Sécurité IDOR)
            if (!user.auth0Id.equals(currentAuth0Id)) {
                throw new ForbiddenException("Cannot update another user's profile");
            }
        }

        // Mise à jour des données optionnelles
        if (req.getName() != null && !req.getName().isBlank()) {
            user.name = req.getName();
        }

        if (req.getAvatarUrl() != null) {
            user.avatarUrl = req.getAvatarUrl();
        }

        // Hibernate persiste ou synchronise les modifications
        userRepository.getEntityManager().merge(user);

        // Le DTO de retour contiendra le VRAI id généré par ta DB/Hibernate
        return toResponse(user);
    }

    @DELETE
    @Path("/{userId}")
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public void apiUsersUserIdDelete(@PathParam("userId") UUID userId) {
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new NotFoundException("User not found: " + userId);
        }

        String callerRole = userSyncService.getRoleFromJwt();
        boolean isAdmin = "ADMIN".equals(callerRole);
        boolean isOwner = user.auth0Id.equals(jwt.getSubject());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Can only deactivate own account unless Admin role");
        }

        user.active = false;
        userRepository.persist(user);
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