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

@Provider // Enregistre cette classe comme un composant JAX-RS
@Priority(Priorities.AUTHENTICATION + 1) // S'exécute juste APRÈS la validation du JWT
public class UserSyncFilter implements ContainerRequestFilter {

    @Inject
    JsonWebToken jwt;

    @Inject
    UserSyncService userSyncService;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        // Si un token valide est présent (le "sub" n'est pas nul)
        if (jwt.getSubject() != null) {
            // On lance la synchronisation (Check & Create)
            userSyncService.syncUser();
        }
    }
}
