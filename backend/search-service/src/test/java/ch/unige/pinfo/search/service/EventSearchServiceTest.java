package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.InjectMock;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.ArrayList;
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

    // ✅ Injecte un Mock pour l'EntityManager afin d'éviter les crashs dans
    // generateFacets()
    @InjectMock
    EntityManager em;

    private Query mockQuery;

    @BeforeEach
    void setUp() {
        mockQuery = mock(Query.class);
        // Comportement par défaut pour generateFacets() pour éviter les
        // NullPointerException. doReturn() au lieu de when().thenReturn() pour
        // bypasser la vérification stricte de type de Mockito : sur un
        // EntityManager Hibernate, createNativeQuery déclare retourner
        // NativeQuery (sous-type de Query), et un mock(Query.class) ne satisfait
        // pas cette contrainte avec when/thenReturn.
        doReturn(mockQuery).when(em).createNativeQuery(anyString());
        when(mockQuery.getResultList()).thenReturn(new ArrayList<>());
    }

    @AfterEach
    void tearDown() {
        // FIX CRUCIAL : Libère le mock de Panache pour ne pas polluer les autres tests
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
        event.eligibleFaculties = List.of("Sciences");
        event.eligibleDegreeLevels = List.of("BACHELOR");
        event.persist();

        // ✅ Correction : Passage des 10 arguments requis par la nouvelle méthode search
        EventSearchResult result = service.search("Test", null, null, null, null, null, null, null, 0, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Test Event", result.getContent().get(0).getTitle());
        assertFalse(result.getContent().get(0).getIsFull());
        assertNotNull(result.getContent().get(0).getRestrictedTo());
    }

    @Test
    void testIsFullMapping() {
        PanacheMock.mock(SearchEvent.class);

        SearchEvent fullEvent = new SearchEvent();
        fullEvent.eventId = UUID.randomUUID();
        fullEvent.title = "Full Event";
        fullEvent.capacity = 10;
        fullEvent.registeredCount = 10;

        PanacheQuery<SearchEvent> query = mock(PanacheQuery.class);
        when(SearchEvent.<SearchEvent>find(anyString(), any(Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(fullEvent));
        when(SearchEvent.count(anyString(), any(Map.class))).thenReturn(1L);

        // ✅ Correction : Passage des 10 arguments requis
        EventSearchResult result = service.search(null, null, null, null, null, null, null, null, 0, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertTrue(result.getContent().get(0).getIsFull());
    }

    @Test
    void testIsFullMapping_NullCapacity() {
        PanacheMock.mock(SearchEvent.class);

        SearchEvent eventNullCapacity = new SearchEvent();
        eventNullCapacity.eventId = UUID.randomUUID();
        eventNullCapacity.capacity = null;
        eventNullCapacity.registeredCount = 5;

        PanacheQuery<SearchEvent> query = mock(PanacheQuery.class);
        when(SearchEvent.<SearchEvent>find(anyString(), any(Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(eventNullCapacity));
        when(SearchEvent.count(anyString(), any(Map.class))).thenReturn(1L);

        // ✅ Correction : Passage des 10 arguments requis
        EventSearchResult result = service.search(null, null, null, null, null, null, null, null, 0, 20);

        assertNotNull(result);
        assertFalse(result.getContent().get(0).getIsFull());
    }
}