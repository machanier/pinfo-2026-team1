package ch.unige.pinfo.event.resource;

import jakarta.annotation.Priority;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

/**
 * JAX-RS filter that enforces X-Internal-Service-Key authentication
 * on all {@code /internal/**} endpoints.
 *
 * Security design (defence-in-depth):
 * 
 * Network layer – Kong only exposes {@code /api/*} routes;
 * {@code /internal/*} is never forwarded to the outside world.
 * Application layer – This filter provides a second gate
 * inside the JVM so that even direct container-to-container calls (e.g. from
 * another compromised pod) are rejected unless they present the correct
 * shared secret.
 * 
 * The key is read from the {@code internal.service.key} config property
 * (env var {@code INTERNAL_SERVICE_KEY} in production). Comparison is done
 * with {@link MessageDigest#isEqual} to prevent timing-oracle attacks.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class InternalSecurityFilter implements ContainerRequestFilter {

    static final String HEADER_NAME = "X-Internal-Service-Key";

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    @Override
    public void filter(ContainerRequestContext ctx) {
        String path = ctx.getUriInfo().getPath();
        // UriInfo.getPath() may return the path with or without a leading slash
        // depending on the JAX-RS implementation (RESTEasy Reactive omits it).
        // Only enforce the service key on internal routes.
        if (!path.startsWith("/internal/") && !path.startsWith("internal/")) {
            return;
        }

        String provided = ctx.getHeaderString(HEADER_NAME);

        // Constant-time comparison to prevent timing-oracle attacks
        boolean valid = provided != null && MessageDigest.isEqual(
                internalServiceKey.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));

        if (!valid) {
            throw new NotAuthorizedException("Invalid internal service key");
        }
    }
}
