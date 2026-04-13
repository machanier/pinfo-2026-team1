package ch.unige.pinfo.user.security;

import jakarta.annotation.Priority;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class InternalServiceKeyFilter implements ContainerRequestFilter {

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    // Lance une exception si le service qui appel une méthode de InternalResource
    // n'a pas le bon service key (celui définit dans le fichier config de user)
    @Override
    public void filter(ContainerRequestContext requestContext) {
        // Si la requête n'est pas interne, on bloque/retourne
        if (!requestContext.getUriInfo().getPath().startsWith("/internal/")) {
            return;
        }

        String serviceKey = requestContext.getHeaderString("X-Internal-Service-Key");

        if (serviceKey == null || !serviceKey.equals(internalServiceKey)) {
            throw new NotAuthorizedException("Invalid internal service key");
        }
    }
}
