package ch.unige.pinfo.commons.security;

import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Shared base for the per-service JAX-RS filters that enforce the
 * {@code X-Internal-Service-Key} header on {@code /internal/**} endpoints
 * (event-, user- and registration-service). Each service ships a thin
 * {@code @Provider} subclass that only supplies its configured key
 * ({@code internal.service.key}); the security-sensitive logic lives here once
 * rather than being copy-pasted into every service.
 *
 * <p>Defence-in-depth: Kong never routes {@code /internal/*}, so this is a
 * second, in-JVM gate behind the NetworkPolicy allowlist. The comparison is
 * constant-time to avoid a timing oracle, and a blank/unset key never matches.
 */
public abstract class AbstractInternalServiceKeyFilter implements ContainerRequestFilter {

    public static final String HEADER_NAME = "X-Internal-Service-Key";

    /** The shared secret configured for this service ({@code internal.service.key}). */
    protected abstract String configuredKey();

    @Override
    public void filter(ContainerRequestContext ctx) {
        String path = ctx.getUriInfo().getPath();
        // UriInfo.getPath() may omit the leading slash depending on the JAX-RS
        // implementation (RESTEasy Reactive omits it). Only guard internal routes;
        // every other request passes through for normal auth/authz.
        if (!path.startsWith("/internal/") && !path.startsWith("internal/")) {
            return;
        }

        String provided = ctx.getHeaderString(HEADER_NAME);
        String key = configuredKey();

        boolean valid = provided != null
                && key != null && !key.isBlank()
                && MessageDigest.isEqual(
                        key.getBytes(StandardCharsets.UTF_8),
                        provided.getBytes(StandardCharsets.UTF_8));

        if (!valid) {
            throw new NotAuthorizedException("Invalid internal service key");
        }
    }
}
