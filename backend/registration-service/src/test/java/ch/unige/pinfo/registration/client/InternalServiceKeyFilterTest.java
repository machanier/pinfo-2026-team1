package ch.unige.pinfo.registration.client;

import jakarta.ws.rs.client.ClientRequestContext;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InternalServiceKeyFilterTest {

    private InternalServiceKeyFilter filterWithKey(String key) throws Exception {
        InternalServiceKeyFilter filter = new InternalServiceKeyFilter();
        Field field = InternalServiceKeyFilter.class.getDeclaredField("internalServiceKey");
        field.setAccessible(true);
        field.set(filter, key);
        return filter;
    }

    private ClientRequestContext contextWithHeaders(MultivaluedMap<String, Object> headers) {
        ClientRequestContext ctx = mock(ClientRequestContext.class);
        when(ctx.getHeaders()).thenReturn(headers);
        return ctx;
    }

    @Test
    @DisplayName("filter adds X-Internal-Service-Key with the default secret")
    void filter_addsHeaderWithDefaultValue() throws Exception {
        InternalServiceKeyFilter filter = filterWithKey("unigevents-internal-secret");
        MultivaluedMap<String, Object> headers = new MultivaluedHashMap<>();

        filter.filter(contextWithHeaders(headers));

        assertEquals("unigevents-internal-secret", headers.getFirst("X-Internal-Service-Key"));
    }

    @Test
    @DisplayName("filter uses a custom configured key value")
    void filter_addsHeaderWithConfiguredValue() throws Exception {
        InternalServiceKeyFilter filter = filterWithKey("my-custom-key");
        MultivaluedMap<String, Object> headers = new MultivaluedHashMap<>();

        filter.filter(contextWithHeaders(headers));

        assertEquals("my-custom-key", headers.getFirst("X-Internal-Service-Key"));
    }

    @Test
    @DisplayName("filter uses putSingle — exactly one value is present after filtering")
    void filter_overwritesExistingHeader() throws Exception {
        InternalServiceKeyFilter filter = filterWithKey("new-secret");
        MultivaluedMap<String, Object> headers = new MultivaluedHashMap<>();
        headers.add("X-Internal-Service-Key", "old-value");

        filter.filter(contextWithHeaders(headers));

        assertEquals("new-secret", headers.getFirst("X-Internal-Service-Key"));
        assertEquals(1, headers.get("X-Internal-Service-Key").size());
    }

    @Test
    @DisplayName("filter does not modify any header other than X-Internal-Service-Key")
    void filter_doesNotTouchOtherHeaders() throws Exception {
        InternalServiceKeyFilter filter = filterWithKey("secret");
        MultivaluedMap<String, Object> headers = new MultivaluedHashMap<>();
        headers.add("Authorization", "Bearer token123");

        filter.filter(contextWithHeaders(headers));

        assertEquals("Bearer token123", headers.getFirst("Authorization"));
        assertEquals(2, headers.size()); // Authorization + X-Internal-Service-Key
    }
}
