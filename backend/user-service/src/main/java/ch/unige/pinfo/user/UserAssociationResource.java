package ch.unige.pinfo.user;

import ch.unige.pinfo.user.openapi.api.AssociationsApi;
import ch.unige.pinfo.user.openapi.model.AssociationProfile;
import ch.unige.pinfo.user.openapi.model.AssociationProfileUpdate;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.util.UUID;

@Path("/api/users/{userId}/association-profile")
public class UserAssociationResource implements AssociationsApi {

    @Override
    public AssociationProfile apiUsersUserIdAssociationProfileGet(UUID userId) {
        User user = User.findById(UserResource.toLongId(userId));
        if (user == null) {
            throw new NotFoundException();
        }

        return new AssociationProfile()
                .userId(userId)
                .associationName(user.username)
                .description(user.email)
                .verified(false);
    }

    @Override
    public AssociationProfile apiUsersUserIdAssociationProfilePut(UUID userId,
            AssociationProfileUpdate associationProfileUpdate) {
        User user = User.findById(UserResource.toLongId(userId));
        if (user == null) {
            throw new NotFoundException();
        }

        if (associationProfileUpdate.getAssociationName() != null
                && !associationProfileUpdate.getAssociationName().isBlank()) {
            user.username = associationProfileUpdate.getAssociationName();
        }

        if (associationProfileUpdate.getDescription() != null) {
            user.email = associationProfileUpdate.getDescription();
        }

        return new AssociationProfile()
                .userId(userId)
                .associationName(user.username)
                .description(user.email)
                .verified(false)
                .logoUrl(associationProfileUpdate.getLogoUrl());
    }
}
