package ch.unige.pinfo.user.auth0;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Auth0TokenResponseTest {

    @Test
    void fields_canBeAssigned() {
        Auth0TokenResponse response = new Auth0TokenResponse();
        response.setAccessToken("token");
        response.setTokenType("Bearer");
        response.setExpiresIn(3600L);

        assertEquals("token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals(3600L, response.getExpiresIn());
    }
}
