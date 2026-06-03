package ch.unige.pinfo.notification.client;

import jakarta.ws.rs.client.ClientRequestContext;
import jakarta.ws.rs.client.ClientRequestFilter;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Adds the X-Internal-Service-Key header to every outgoing REST client request
 * so that calls to /internal/** endpoints on other services are authenticated.
 */
@ApplicationScoped
public class InternalServiceKeyFilter implements ClientRequestFilter {

    @ConfigProperty(name = "internal.service.key")
    String internalServiceKey;

    @Override
    public void filter(ClientRequestContext requestContext) {
        requestContext.getHeaders().putSingle("X-Internal-Service-Key", internalServiceKey);
    }
}