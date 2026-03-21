package ch.unige.pinfo.user;

import ch.unige.pinfo.user.openapi.api.UsersApi;
import ch.unige.pinfo.user.openapi.model.UpdateUserRequest;
import ch.unige.pinfo.user.openapi.model.UserResponse;
import ch.unige.pinfo.user.openapi.model.UserRole;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.time.OffsetDateTime;
import java.util.UUID;

@Path("/api/users/{userId}")
public class UserResource implements UsersApi {

    @Override
    public void apiUsersUserIdDelete(UUID userId) {
        User user = User.findById(toLongId(userId));
        if (user == null) {
            throw new NotFoundException();
        }
        user.delete();
    }

    @Override
    public UserResponse apiUsersUserIdGet(UUID userId) {
        User user = User.findById(toLongId(userId));
        if (user == null) {
            throw new NotFoundException();
        }
        return toUserResponse(user, userId);
    }

    @Override
    @Transactional
    public UserResponse apiUsersUserIdPut(UUID userId, UpdateUserRequest updateUserRequest) {
        User user = User.findById(toLongId(userId));
        if (user == null) {
            throw new NotFoundException();
        }

        if (updateUserRequest.getName() != null && !updateUserRequest.getName().isBlank()) {
            user.username = updateUserRequest.getName();
        }

        return toUserResponse(user, userId);
    }

    static UserResponse toUserResponse(User user, UUID id) {
        return new UserResponse()
                .id(id)
                .name(user.username)
                .role(UserRole.STUDENT)
                .createdAt(OffsetDateTime.now());
    }

    static long toLongId(UUID id) {
        return id.getLeastSignificantBits() & Long.MAX_VALUE;
    }

    static UUID toUuid(long id) {
        return new UUID(0L, id);
    }
}
