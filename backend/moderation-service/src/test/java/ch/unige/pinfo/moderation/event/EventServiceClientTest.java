package ch.unige.pinfo.moderation.event;

import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class EventServiceClientTest {

    @Test
    void client_annotations_matchEventServiceContract() throws Exception {
        Path basePath = EventServiceClient.class.getAnnotation(Path.class);
        RegisterRestClient restClient = EventServiceClient.class.getAnnotation(RegisterRestClient.class);

        assertNotNull(basePath);
        assertEquals("/api/events", basePath.value());
        assertNotNull(restClient);
        assertEquals("event-service", restClient.configKey());

        var method = EventServiceClient.class.getMethod("publishEvent", UUID.class, String.class);
        assertNotNull(method.getAnnotation(PATCH.class));

        Path methodPath = method.getAnnotation(Path.class);
        assertNotNull(methodPath);
        assertEquals("/{eventId}/publish", methodPath.value());

        Produces produces = method.getAnnotation(Produces.class);
        assertNotNull(produces);
        assertEquals(MediaType.APPLICATION_JSON, produces.value()[0]);

        PathParam eventIdParam = method.getParameters()[0].getAnnotation(PathParam.class);
        HeaderParam headerParam = method.getParameters()[1].getAnnotation(HeaderParam.class);
        assertNotNull(eventIdParam);
        assertEquals("eventId", eventIdParam.value());
        assertNotNull(headerParam);
        assertEquals("X-Internal-Service-Key", headerParam.value());
    }
}
