package ch.unige.pinfo.user.security;

import ch.unige.pinfo.user.service.UserSyncService;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.io.IOException;

@Provider
@Priority(Priorities.AUTHENTICATION + 1)
public class UserSyncFilter implements ContainerRequestFilter {

    private final JsonWebToken jwt;
    private final UserSyncService userSyncService;

    @Inject
    public UserSyncFilter(JsonWebToken jwt, UserSyncService userSyncService) {
        this.jwt = jwt;
        this.userSyncService = userSyncService;
    }

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {

        if (jwt.getSubject() != null) {

            userSyncService.syncUser();
        }
    }
}