package ch.unige.pinfo.registration.client;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.annotation.RegisterProvider;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class EventServiceClientTest {

    @Test
    @DisplayName("Interface should carry @RegisterRestClient with configKey 'event-service'")
    void interface_hasRegisterRestClientAnnotation() {
        RegisterRestClient annotation = EventServiceClient.class.getAnnotation(RegisterRestClient.class);

        assertNotNull(annotation, "@RegisterRestClient must be present on EventServiceClient");
        assertEquals("event-service", annotation.configKey());
    }

    @Test
    @DisplayName("Interface should be mapped to base path '/internal'")
    void interface_hasPathAnnotation() {
        Path path = EventServiceClient.class.getAnnotation(Path.class);

        assertNotNull(path, "@Path must be present on EventServiceClient");
        assertEquals("/internal", path.value());
    }

    @Test
    @DisplayName("Interface should register InternalServiceKeyFilter as a provider")
    void interface_hasRegisterProviderAnnotation() {
        RegisterProvider provider = EventServiceClient.class.getAnnotation(RegisterProvider.class);

        assertNotNull(provider, "@RegisterProvider must be present on EventServiceClient");
        assertEquals(InternalServiceKeyFilter.class, provider.value());
    }

    @Test
    @DisplayName("getEvent should be annotated @GET and map to /events/{eventId}")
    void getEvent_hasCorrectAnnotations() throws NoSuchMethodException {
        var method = EventServiceClient.class.getMethod("getEvent", UUID.class);

        assertNotNull(method.getAnnotation(GET.class), "getEvent must carry @GET");

        Path path = method.getAnnotation(Path.class);
        assertNotNull(path, "getEvent must carry @Path");
        assertEquals("/events/{eventId}", path.value());

        PathParam param = method.getParameters()[0].getAnnotation(PathParam.class);
        assertNotNull(param, "First parameter of getEvent must carry @PathParam");
        assertEquals("eventId", param.value());
    }

    @Test
    @DisplayName("getCapacity should be annotated @GET and map to /events/{eventId}/capacity")
    void getCapacity_hasCorrectAnnotations() throws NoSuchMethodException {
        var method = EventServiceClient.class.getMethod("getCapacity", UUID.class);

        assertNotNull(method.getAnnotation(GET.class), "getCapacity must carry @GET");

        Path path = method.getAnnotation(Path.class);
        assertNotNull(path, "getCapacity must carry @Path");
        assertEquals("/events/{eventId}/capacity", path.value());

        PathParam param = method.getParameters()[0].getAnnotation(PathParam.class);
        assertNotNull(param, "First parameter of getCapacity must carry @PathParam");
        assertEquals("eventId", param.value());
    }
}
