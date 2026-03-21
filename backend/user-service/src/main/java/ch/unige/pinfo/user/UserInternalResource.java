package ch.unige.pinfo.user;

import ch.unige.pinfo.user.openapi.api.InternalApi;
import ch.unige.pinfo.user.openapi.model.EligibilityAttributes;
import ch.unige.pinfo.user.openapi.model.InternalUsersUserIdExistsGet200Response;
import ch.unige.pinfo.user.openapi.model.UserRole;
import jakarta.ws.rs.Path;
import java.util.UUID;

@Path("/internal/users/{userId}")
public class UserInternalResource implements InternalApi {

    @Override
    public EligibilityAttributes internalUsersUserIdEligibilityGet(UUID userId) {
        return new EligibilityAttributes()
                .userId(userId)
                .faculty("Unknown")
                .major("Unknown")
                .degreeLevel(EligibilityAttributes.DegreeLevelEnum.BACHELOR);
    }

    @Override
    public InternalUsersUserIdExistsGet200Response internalUsersUserIdExistsGet(UUID userId) {
        User user = User.findById(UserResource.toLongId(userId));
        return new InternalUsersUserIdExistsGet200Response()
                .exists(user != null)
                .role(UserRole.STUDENT);
    }
}
