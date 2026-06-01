package ch.unige.pinfo.user.service;

import ch.unige.pinfo.user.auth0.Auth0ManagementClient;
import ch.unige.pinfo.user.auth0.Auth0TokenClient;
import ch.unige.pinfo.user.auth0.Auth0TokenRequest;
import ch.unige.pinfo.user.auth0.Auth0TokenResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

@ApplicationScoped
public class Auth0ManagementService {

    private static final Logger LOG = Logger.getLogger(Auth0ManagementService.class);
    private static final String GRANT_TYPE = "client_credentials";

    private final Auth0TokenClient tokenClient;
    private final Auth0ManagementClient managementClient;
    private final String clientId;
    private final String clientSecret;
    private final String audience;

    @Inject
    public Auth0ManagementService(
            @RestClient Auth0TokenClient tokenClient,
            @RestClient Auth0ManagementClient managementClient,
            @ConfigProperty(name = "auth0.management.client-id") String clientId,
            @ConfigProperty(name = "auth0.management.client-secret") String clientSecret,
            @ConfigProperty(name = "auth0.management.audience") String audience) {
        this.tokenClient = tokenClient;
        this.managementClient = managementClient;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.audience = audience;
    }

    public void deleteUser(String auth0Id) {
        String token = fetchManagementToken();

        try {
            managementClient.deleteUser("Bearer " + token, auth0Id);
        } catch (WebApplicationException ex) {
            LOG.errorf(ex, "Auth0 Management API delete failed for %s", auth0Id);
            throw ex;
        }
    }

    private String fetchManagementToken() {
        Auth0TokenRequest request = new Auth0TokenRequest(GRANT_TYPE, clientId, clientSecret, audience);
        Auth0TokenResponse response = tokenClient.requestToken(request);
        if (response == null || response.getAccessToken() == null || response.getAccessToken().isBlank()) {
            throw new WebApplicationException("Auth0 Management token request failed", 502);
        }
        return response.getAccessToken();
    }
}
