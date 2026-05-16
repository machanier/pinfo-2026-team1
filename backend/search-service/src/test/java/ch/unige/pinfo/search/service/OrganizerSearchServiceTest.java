package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchResult;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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

    private SearchOrganizer sampleOrg;

    @BeforeEach
    void setup() {
        sampleOrg = new SearchOrganizer();
        sampleOrg.userId = UUID.randomUUID();
        sampleOrg.description = "Une description";
        sampleOrg.associationName = "Club Alpin";
        sampleOrg.upcomingEventCount = 3;
        sampleOrg.logoUrl = "https://example.com/logo.png"; // URL valide pour URI.create
        sampleOrg.verified = true;
    }

    @AfterEach
    void tearDown() {
        PanacheMock.reset();
    }

    @Test
    void testSearchWithQuery() {
        PanacheMock.mock(SearchOrganizer.class);

        PanacheQuery<SearchOrganizer> query = mock(PanacheQuery.class);
        when(SearchOrganizer.find(anyString(), any(java.util.Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(sampleOrg));
        when(query.count()).thenReturn(1L);

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
        when((PanacheQuery) SearchOrganizer.findAll()).thenReturn(query);

        when(query.page(anyInt(), anyInt())).thenReturn(query);
        // FIX : On renvoie une liste avec une entité pour s'assurer que mapToHit est
        // traversé dans le bloc ELSE
        when(query.list()).thenReturn(List.of(sampleOrg));
        when(query.count()).thenReturn(1L);

        OrganizerSearchResult result = service.search(null, 0, 10);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        PanacheMock.verify(SearchOrganizer.class).findAll();
    }

    @Test
    void testPaginationCalculations() {
        PanacheMock.mock(SearchOrganizer.class);

        PanacheQuery<SearchOrganizer> query = mock(PanacheQuery.class);
        when((PanacheQuery) SearchOrganizer.findAll()).thenReturn(query);

        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(sampleOrg));

        // Simuler 25 éléments avec une taille de page de 10 -> doit faire 3 pages
        when(query.count()).thenReturn(25L);

        OrganizerSearchResult result = service.search("", 0, 10);

        assertEquals(25, result.getTotalElements());
        assertEquals(3, result.getTotalPages()); // Valide l'arithmétique Math.ceil
    }

    @Test
    void testSearchWithMalformedLogoUrl() {
        PanacheMock.mock(SearchOrganizer.class);

        // On teste une chaîne qui pourrait casser le composant URI ou lever une runtime
        // exception inattendue
        sampleOrg.logoUrl = "invalid-url-format";

        PanacheQuery<SearchOrganizer> query = mock(PanacheQuery.class);
        when(SearchOrganizer.find(anyString(), any(java.util.Map.class))).thenReturn(query);
        when(query.page(anyInt(), anyInt())).thenReturn(query);
        when(query.list()).thenReturn(List.of(sampleOrg));
        when(query.count()).thenReturn(1L);

        // On vérifie que la méthode gère la conversion d'URI sans tout casser ou
        // propage l'erreur de façon attendue
        assertDoesNotThrow(() -> service.search("club", 0, 10));
    }
}