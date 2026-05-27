package ch.unige.pinfo.user.auth0;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Auth0TokenRequestTest {

    @Test
    void defaultConstructor_setsNullFields() {
        Auth0TokenRequest request = new Auth0TokenRequest();

        assertNull(request.getGrantType());
        assertNull(request.getClientId());
        assertNull(request.getClientSecret());
        assertNull(request.getAudience());
    }

    @Test
    void constructor_setsFields() {
        Auth0TokenRequest request = new Auth0TokenRequest(
                "client_credentials",
                "client-id",
                "client-secret",
                "https://tenant.auth0.com/api/v2/");

        assertEquals("client_credentials", request.getGrantType());
        assertEquals("client-id", request.getClientId());
        assertEquals("client-secret", request.getClientSecret());
        assertEquals("https://tenant.auth0.com/api/v2/", request.getAudience());
    }

    @Test
    void setters_updateFields() {
        Auth0TokenRequest request = new Auth0TokenRequest();

        request.setGrantType("client_credentials");
        request.setClientId("client-id");
        request.setClientSecret("client-secret");
        request.setAudience("https://tenant.auth0.com/api/v2/");

        assertEquals("client_credentials", request.getGrantType());
        assertEquals("client-id", request.getClientId());
        assertEquals("client-secret", request.getClientSecret());
        assertEquals("https://tenant.auth0.com/api/v2/", request.getAudience());
    }
}
