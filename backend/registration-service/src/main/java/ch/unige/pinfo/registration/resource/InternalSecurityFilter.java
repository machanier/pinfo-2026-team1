package ch.unige.pinfo.registration.resource;

import jakarta.annotation.Priority;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Enforces X-Internal-Service-Key authentication on all /internal/** endpoints
 * (Review S3). registration-service exposes
 * /internal/events/{eventId}/registrations/{participants,confirmed} which return
 * lists of student UUIDs. Until now registration only shipped the *outgoing*
 * client filter (see {@code client.InternalServiceKeyFilter}); the server side
 * had no gate, so any in-cluster pod could read participant lists without the
 * shared secret. This mirrors event-service and user-service.
 *
 * Defence-in-depth: Kong never routes /internal/*, so this is a second, in-JVM
 * gate behind the NetworkPolicy allowlist. Comparison is constant-time to avoid a
 * timing oracle, and a blank/unset configured key never matches.
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
        // UriInfo.getPath() may omit the leading slash depending on the JAX-RS
        // implementation (RESTEasy Reactive omits it). Only guard internal routes;
        // everything else passes through for normal handling.
        if (!path.startsWith("/internal/") && !path.startsWith("internal/")) {
            return;
        }

        String provided = ctx.getHeaderString(HEADER_NAME);

        boolean valid = provided != null
                && internalServiceKey != null && !internalServiceKey.isBlank()
                && MessageDigest.isEqual(
                        internalServiceKey.getBytes(StandardCharsets.UTF_8),
                        provided.getBytes(StandardCharsets.UTF_8));

        if (!valid) {
            throw new NotAuthorizedException("Invalid internal service key");
        }
    }
}
