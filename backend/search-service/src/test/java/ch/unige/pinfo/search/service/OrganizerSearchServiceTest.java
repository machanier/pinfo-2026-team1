package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchResult;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
public class OrganizerSearchServiceTest {

    @Inject
    OrganizerSearchService service;

    @Test
    void testSearchWithQuery() {
        PanacheMock.mock(SearchOrganizer.class);

        // Simulation d'une entité
        SearchOrganizer org = new SearchOrganizer();
        org.userId = UUID.randomUUID();
        org.description = "Une description";
        org.associationName = "Club Alpin";
        org.upcomingEventCount = 3;
        org.logoUrl = "https://example.com/logo.png";
        org.verified = true;

        // Mock de la requête Panache
        PanacheQuery<SearchOrganizer> query = mock(PanacheQuery.class);
        when(SearchOrganizer.find(anyString(), any(java.util.Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(org));
        when(query.count()).thenReturn(1L);

        // Exécution avec une requête 'q' (couvre la branche IF)
        OrganizerSearchResult result = service.search("club", 0, 10);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Club Alpin", result.getContent().get(0).getAssociationName());
        verify(query).page(0, 10);
    }

    @Test
    void testSearchWithoutQuery() {
        PanacheMock.mock(SearchOrganizer.class);

        PanacheQuery<SearchOrganizer> query = mock(PanacheQuery.class);

        // On passe par un cast (PanacheQuery) sans génériques pour "tromper" le
        // compilateur
        when((PanacheQuery) SearchOrganizer.findAll()).thenReturn(query);

        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of());
        when(query.count()).thenReturn(0L);

        // Exécution
        OrganizerSearchResult result = service.search(null, 0, 10);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        PanacheMock.verify(SearchOrganizer.class).findAll();
    }

    @Test
    void testPaginationCalculations() {
        PanacheMock.mock(SearchOrganizer.class);

        PanacheQuery<SearchOrganizer> query = mock(PanacheQuery.class);

        // Cast vers le type brut (PanacheQuery) pour éviter l'erreur de généricité
        when((PanacheQuery) SearchOrganizer.findAll()).thenReturn(query);

        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of());

        // Simuler 25 éléments avec une taille de page de 10 -> doit faire 3 pages
        when(query.count()).thenReturn(25L);

        // "" (chaîne vide) devrait tomber dans le "else" (findAll) selon ta logique
        // !q.isBlank()
        OrganizerSearchResult result = service.search("", 0, 10);

        assertEquals(25, result.getTotalElements());
        assertEquals(3, result.getTotalPages()); // Math.ceil(2.5) = 3
    }
}