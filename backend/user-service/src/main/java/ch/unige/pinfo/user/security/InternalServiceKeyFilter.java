package ch.unige.pinfo.user.security;

import ch.unige.pinfo.commons.security.AbstractInternalServiceKeyFilter;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Enforces X-Internal-Service-Key on user-service's /internal/** endpoints
 * (e.g. /internal/users/{id}/exists). Validation lives in
 * {@link AbstractInternalServiceKeyFilter}; this subclass only supplies the key.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class InternalServiceKeyFilter extends AbstractInternalServiceKeyFilter {

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    @Override
    protected String configuredKey() {
        return internalServiceKey;
    }
}
