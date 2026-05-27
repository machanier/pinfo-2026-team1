package ch.unige.pinfo.user.auth0;

import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class Auth0ManagementClientTest {

    @Test
    void classAnnotations_areConfigured() {
        Path path = Auth0ManagementClient.class.getAnnotation(Path.class);
        RegisterRestClient restClient = Auth0ManagementClient.class.getAnnotation(RegisterRestClient.class);

        assertEquals("/api/v2", path.value());
        assertEquals("auth0-management", restClient.configKey());
    }

    @Test
    void deleteUser_annotations_areConfigured() throws Exception {
        Method method = Auth0ManagementClient.class.getMethod("deleteUser", String.class, String.class);

        assertNotNull(method.getAnnotation(DELETE.class));
        assertEquals("/users/{id}", method.getAnnotation(Path.class).value());

        Parameter[] parameters = method.getParameters();
        assertEquals("Authorization", parameters[0].getAnnotation(HeaderParam.class).value());
        assertEquals("id", parameters[1].getAnnotation(PathParam.class).value());
    }
}
