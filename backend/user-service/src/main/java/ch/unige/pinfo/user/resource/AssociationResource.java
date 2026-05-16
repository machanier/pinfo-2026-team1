package ch.unige.pinfo.user.resource;

import java.util.UUID;

import ch.unige.pinfo.user.model.Association;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.openapi.api.AssociationsApi;
import ch.unige.pinfo.user.openapi.model.AssociationProfile;
import ch.unige.pinfo.user.openapi.model.AssociationProfileUpdate;
import ch.unige.pinfo.user.repository.UserRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users/{userId}/association-profile")
public class AssociationResource implements AssociationsApi {

    private final UserRepository userRepository;
    private final JsonWebToken jwt;
    private final EntityManager entityManager;

    @Inject
    public AssociationResource(UserRepository userRepository, JsonWebToken jwt, EntityManager entityManager) {
        this.userRepository = userRepository;
        this.jwt = jwt;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public AssociationProfile apiUsersUserIdAssociationProfileGet(@PathParam("userId") UUID userId) {
        return toAssociationProfile(getAssociationOrThrow(userId));
    }

    @Override
    @Transactional
    @RolesAllowed({ "ORGANIZER", "ASSOCIATION", "ADMIN" })
    public AssociationProfile apiUsersUserIdAssociationProfilePut(@PathParam("userId") UUID userId,
            @Valid @NotNull AssociationProfileUpdate associationProfileUpdate) {

        Association association = getAssociationOrThrow(userId);

        if (!association.getAuth0Id().equals(jwt.getSubject())) {
            throw new ForbiddenException("Can only update own profile");
        }

        association.setDescription(associationProfileUpdate.getDescription());

        userRepository.persist(association);

        return toAssociationProfile(association);
    }

    // Trouve l'association dans la base de données
    private Association getAssociationOrThrow(UUID userId) {
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new NotFoundException("User not found: " + userId);
        }

        if (user instanceof Association association) {
            return association;
        }

        // Backfill legacy organizer accounts that were created as base User only.
        boolean isOrganizer = user.getRole() != null && "organizer".equalsIgnoreCase(user.getRole());
        boolean isOwner = user.getAuth0Id() != null && user.getAuth0Id().equals(jwt.getSubject());

        if (isOrganizer && isOwner) {
            entityManager.createNativeQuery(
                    "INSERT INTO association (id, description) VALUES (?1, ?2) ON CONFLICT (id) DO NOTHING")
                    .setParameter(1, userId)
                    .setParameter(2, "")
                    .executeUpdate();

            // Clear first-level cache so joined-subtype row becomes visible immediately.
            entityManager.flush();
            entityManager.clear();

            Association association = entityManager.find(Association.class, userId);
            if (association != null) {
                return association;
            }
        }

        throw new NotFoundException("User not found or user is not an association: " + userId);
    }

    // Conversion de entité Association à DTO AssociationProfile
    private AssociationProfile toAssociationProfile(Association association) {
        return new AssociationProfile()
                .userId(association.id)
                .description(association.getDescription());
    }
}