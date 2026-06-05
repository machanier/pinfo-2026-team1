package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.commons.security.AbstractInternalServiceKeyFilter;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Enforces X-Internal-Service-Key on event-service's /internal/** endpoints.
 * The validation lives in {@link AbstractInternalServiceKeyFilter}; this
 * subclass only supplies the configured key.
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
