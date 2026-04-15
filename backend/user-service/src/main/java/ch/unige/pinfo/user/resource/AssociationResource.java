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
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users/{userId}/association-profile")
public class AssociationResource implements AssociationsApi {

    private final UserRepository userRepository;
    private final JsonWebToken jwt;

    @Inject
    public AssociationResource(UserRepository userRepository, JsonWebToken jwt) {
        this.userRepository = userRepository;
        this.jwt = jwt;
    }

    @Override
    public AssociationProfile apiUsersUserIdAssociationProfileGet(@PathParam("userId") UUID userId) {
        return toAssociationProfile(getAssociationOrThrow(userId));
    }

    @Override
    @Transactional
    @RolesAllowed({ "Association", "Admin" })
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
        if (!(user instanceof Association association)) {
            throw new NotFoundException("User not found or user is not an association: " + userId);
        }
        return association;
    }

    // Conversion de entité Association à DTO AssociationProfile
    private AssociationProfile toAssociationProfile(Association association) {
        return new AssociationProfile()
                .userId(association.id)
                .description(association.getDescription());
    }
}