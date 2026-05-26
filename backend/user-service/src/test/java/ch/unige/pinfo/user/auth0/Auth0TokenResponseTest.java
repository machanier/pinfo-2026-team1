package ch.unige.pinfo.user.auth0;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Auth0TokenResponseTest {

    @Test
    void fields_canBeAssigned() {
        Auth0TokenResponse response = new Auth0TokenResponse();
        response.access_token = "token";
        response.token_type = "Bearer";
        response.expires_in = 3600L;

        assertEquals("token", response.access_token);
        assertEquals("Bearer", response.token_type);
        assertEquals(3600L, response.expires_in);
    }
}
