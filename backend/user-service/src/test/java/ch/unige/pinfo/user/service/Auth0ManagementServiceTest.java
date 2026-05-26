package ch.unige.pinfo.user.service;

import ch.unige.pinfo.user.auth0.Auth0ManagementClient;
import ch.unige.pinfo.user.auth0.Auth0TokenClient;
import ch.unige.pinfo.user.auth0.Auth0TokenRequest;
import ch.unige.pinfo.user.auth0.Auth0TokenResponse;
import jakarta.ws.rs.WebApplicationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class Auth0ManagementServiceTest {

    @Mock
    Auth0TokenClient tokenClient;

    @Mock
    Auth0ManagementClient managementClient;

    private Auth0ManagementService service;

    @BeforeEach
    void setUp() {
        service = new Auth0ManagementService(
                tokenClient,
                managementClient,
                "client-id",
                "client-secret",
                "https://tenant.auth0.com/api/v2/");
    }

    @Test
    void deleteUser_fetchesTokenAndCallsManagementApi() {
        Auth0TokenResponse response = new Auth0TokenResponse();
        response.access_token = "token-123";
        when(tokenClient.requestToken(any(Auth0TokenRequest.class))).thenReturn(response);

        service.deleteUser("auth0|user-1");

        verify(managementClient).deleteUser("Bearer token-123", "auth0|user-1");
    }

    @Test
    void deleteUser_propagatesManagementError() {
        Auth0TokenResponse response = new Auth0TokenResponse();
        response.access_token = "token-123";
        when(tokenClient.requestToken(any(Auth0TokenRequest.class))).thenReturn(response);
        doThrow(new WebApplicationException(500)).when(managementClient)
                .deleteUser(eq("Bearer token-123"), eq("auth0|user-1"));

        assertThrows(WebApplicationException.class, () -> service.deleteUser("auth0|user-1"));
    }

    @Test
    void deleteUser_missingToken_throws502() {
        when(tokenClient.requestToken(any(Auth0TokenRequest.class))).thenReturn(new Auth0TokenResponse());

        WebApplicationException ex = assertThrows(WebApplicationException.class,
                () -> service.deleteUser("auth0|user-1"));

        assertEquals(502, ex.getResponse().getStatus());
    }
}
