package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
public class EventSearchServiceTest {

    @Inject
    EventSearchService service;

    @Test
    void testSearchMappingAndPagination() {
        SearchEvent event = new SearchEvent();
        event.eventId = UUID.randomUUID();
        event.title = "Test Event";
        event.capacity = 10;
        event.registeredCount = 5;
        event.persist();

        EventSearchResult result = service.search("Test", null, null, 0, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Test Event", result.getContent().get(0).getTitle());
        assertFalse(result.getContent().get(0).getIsFull());
    }

    @Test
    void testIsFullMapping() {
        PanacheMock.mock(SearchEvent.class);

        SearchEvent fullEvent = new SearchEvent();
        fullEvent.capacity = 10;
        fullEvent.registeredCount = 10;

        PanacheQuery query = mock(PanacheQuery.class);
        when(SearchEvent.find(anyString(), any(Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(fullEvent));

        EventSearchResult result = service.search(null, null, null, 0, 20);

        assertTrue(result.getContent().get(0).getIsFull());
    }
}