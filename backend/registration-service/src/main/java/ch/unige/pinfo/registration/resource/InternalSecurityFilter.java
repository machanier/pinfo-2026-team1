package ch.unige.pinfo.registration.resource;

import ch.unige.pinfo.commons.security.AbstractInternalServiceKeyFilter;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Enforces X-Internal-Service-Key on registration-service's /internal/**
 * endpoints (Review S3): /internal/events/{id}/registrations/{participants,
 * confirmed} return student-UUID lists and previously had no server-side gate.
 * Validation lives in {@link AbstractInternalServiceKeyFilter}; this subclass
 * only supplies the configured key.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class InternalSecurityFilter extends AbstractInternalServiceKeyFilter {

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    @Override
    protected String configuredKey() {
        return internalServiceKey;
    }
}
