package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
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

    @AfterEach
    void tearDown() {
        // FIX CRUCIAL : Libère le mock de Panache pour que le test transactionnel réel
        // ne s'exécute pas sur une classe mockée vide
        PanacheMock.reset();
    }

    @Test
    @Transactional
    void testSearchMappingAndPagination() {
        SearchEvent.deleteAll();

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
        fullEvent.eventId = UUID.randomUUID();
        fullEvent.title = "Full Event";
        fullEvent.capacity = 10;
        fullEvent.registeredCount = 10;

        // Mock de la requête de recherche (.find)
        PanacheQuery<SearchEvent> query = mock(PanacheQuery.class);
        when(SearchEvent.<SearchEvent>find(anyString(), any(Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(fullEvent));

        // FIX : Mock également la méthode statique .count() appelée juste après !
        when(SearchEvent.count(anyString(), any(Map.class))).thenReturn(1L);

        EventSearchResult result = service.search(null, null, null, 0, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertTrue(result.getContent().get(0).getIsFull()); // Valide la condition capacity != null && registeredCount
                                                            // >= capacity
    }

    @Test
    void testIsFullMapping_NullCapacity() {
        PanacheMock.mock(SearchEvent.class);

        // Cas limite : Tester la branche "capacity == null" du mapToHit pour obtenir
        // 100% de couverture de branche
        SearchEvent eventNullCapacity = new SearchEvent();
        eventNullCapacity.eventId = UUID.randomUUID();
        eventNullCapacity.capacity = null;
        eventNullCapacity.registeredCount = 5;

        PanacheQuery<SearchEvent> query = mock(PanacheQuery.class);
        when(SearchEvent.<SearchEvent>find(anyString(), any(Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(eventNullCapacity));
        when(SearchEvent.count(anyString(), any(Map.class))).thenReturn(1L);

        EventSearchResult result = service.search(null, null, null, 0, 20);

        assertNotNull(result);
        assertFalse(result.getContent().get(0).getIsFull()); // Doit être false car capacity est null
    }
}