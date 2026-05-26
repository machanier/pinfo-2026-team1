package ch.unige.pinfo.user.auth0;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class Auth0TokenRequestTest {

    @Test
    void defaultConstructor_setsNullFields() {
        Auth0TokenRequest request = new Auth0TokenRequest();

        assertNull(request.grant_type);
        assertNull(request.client_id);
        assertNull(request.client_secret);
        assertNull(request.audience);
    }

    @Test
    void constructor_setsFields() {
        Auth0TokenRequest request = new Auth0TokenRequest(
                "client_credentials",
                "client-id",
                "client-secret",
                "https://tenant.auth0.com/api/v2/");

        assertEquals("client_credentials", request.grant_type);
        assertEquals("client-id", request.client_id);
        assertEquals("client-secret", request.client_secret);
        assertEquals("https://tenant.auth0.com/api/v2/", request.audience);
    }
}
