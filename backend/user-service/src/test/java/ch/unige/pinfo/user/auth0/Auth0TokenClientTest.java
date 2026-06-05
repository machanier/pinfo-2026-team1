package ch.unige.pinfo.user.auth0;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class Auth0TokenClientTest {

    @Test
    void classAnnotations_areConfigured() {
        Path path = Auth0TokenClient.class.getAnnotation(Path.class);
        RegisterRestClient restClient = Auth0TokenClient.class.getAnnotation(RegisterRestClient.class);

        assertEquals("/oauth/token", path.value());
        assertEquals("auth0-token", restClient.configKey());
    }

    @Test
    void requestToken_annotations_areConfigured() throws Exception {
        Method method = Auth0TokenClient.class.getMethod("requestToken", Auth0TokenRequest.class);

        assertNotNull(method.getAnnotation(POST.class));
        assertNotNull(method.getAnnotation(Consumes.class));
        assertNotNull(method.getAnnotation(Produces.class));
        assertEquals(MediaType.APPLICATION_JSON, method.getAnnotation(Consumes.class).value()[0]);
        assertEquals(MediaType.APPLICATION_JSON, method.getAnnotation(Produces.class).value()[0]);
    }
}
