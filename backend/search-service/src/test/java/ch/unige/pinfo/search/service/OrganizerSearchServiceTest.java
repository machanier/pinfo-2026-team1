package ch.unige.pinfo.search.service;

import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.openapi.model.OrganizerSearchResult;
import ch.unige.pinfo.search.repository.OrganizerSearchRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class OrganizerSearchServiceTest {

    @Inject
    OrganizerSearchService service;

    @Inject
    OrganizerSearchRepository repository;

    private UUID org1Id;
    private UUID org2Id;
    private UUID org3Id;

    @BeforeEach
    @Transactional
    void setup() {
        // Nettoyer les données précédentes
        repository.deleteAll();

        // Créer 3 organisateurs de test
        SearchOrganizer org1 = new SearchOrganizer();
        org1.userId = UUID.randomUUID();
        org1.description = "Club alpin avec activités de montagne";
        org1.associationName = "Club Alpin Français";
        org1.upcomingEventCount = 5;
        org1.logoUrl = "https://example.com/logo1.png";
        org1.verified = true;
        repository.persist(org1);
        org1Id = org1.userId;

        SearchOrganizer org2 = new SearchOrganizer();
        org2.userId = UUID.randomUUID();
        org2.description = "Société d'escalade et voies ferrées";
        org2.associationName = "Société d'Escalade";
        org2.upcomingEventCount = 3;
        org2.logoUrl = "https://example.com/logo2.png";
        org2.verified = true;
        repository.persist(org2);
        org2Id = org2.userId;

        SearchOrganizer org3 = new SearchOrganizer();
        org3.userId = UUID.randomUUID();
        org3.description = "Association de randonnée pédestre";
        org3.associationName = "Rando Aventure";
        org3.upcomingEventCount = null; // Test avec null
        org3.logoUrl = "invalid-url-format"; // Test avec URL invalide
        org3.verified = false;
        repository.persist(org3);
        org3Id = org3.userId;
    }

    @Test
    @Transactional
    void testSearchWithQuery() {
        // Chercher les organisateurs contenant "club"
        OrganizerSearchResult result = service.search("club", 0, 10);

        assertNotNull(result);
        assertTrue(result.getTotalElements() >= 1, "Devrait trouver au moins le Club Alpin");
        assertTrue(result.getContent().stream()
                .anyMatch(org -> org.getAssociationName().contains("Club")),
                "Devrait contenir 'Club Alpin Français'");
    }

    @Test
    @Transactional
    void testSearchWithoutQuery() {
        // Chercher tous les organisateurs (query null ou vide)
        OrganizerSearchResult result = service.search(null, 0, 10);

        assertNotNull(result);
        assertTrue(result.getTotalElements() >= 3, "Devrait trouver au moins les 3 organisateurs");
        assertEquals(3, result.getTotalElements(), "Devrait avoir exactement 3 organisateurs");
    }

    @Test
    @Transactional
    void testSearchEmptyQuery() {
        // Chercher avec query vide
        OrganizerSearchResult result = service.search("", 0, 10);

        assertNotNull(result);
        assertTrue(result.getTotalElements() >= 3, "Query vide devrait retourner tous les résultats");
    }

    @Test
    @Transactional
    void testPaginationPage0() {
        OrganizerSearchResult result = service.search(null, 0, 2);

        assertNotNull(result);
        assertEquals(3, result.getTotalElements());
        assertEquals(2, result.getContent().size(), "Première page avec size=2");
        assertEquals(0, result.getPage());
    }

    @Test
    @Transactional
    void testPaginationPage1() {
        OrganizerSearchResult result = service.search(null, 1, 2);

        assertNotNull(result);
        assertEquals(3, result.getTotalElements());
        assertEquals(1, result.getContent().size(), "Deuxième page avec size=2");
        assertEquals(1, result.getPage());
    }

    @Test
    @Transactional
    void testPaginationCalculations() {
        // 3 éléments avec size=2 -> doit faire 2 pages
        OrganizerSearchResult result = service.search(null, 0, 2);

        assertEquals(3, result.getTotalElements());
        assertEquals(2, result.getTotalPages(), "3 éléments / 2 par page = 2 pages");
    }

    @Test
    @Transactional
    void testSearchWithMalformedLogoUrl() {
        // Chercher l'organisateur avec URL invalide
        OrganizerSearchResult result = service.search("rando", 0, 10);

        assertNotNull(result);
        // Vérifier que la méthode gère l'URL invalide sans planter
        assertTrue(result.getContent().stream()
                .anyMatch(org -> "Rando Aventure".equals(org.getAssociationName())),
                "Devrait gérer l'URL invalide sans erreur");
    }

    @Test
    @Transactional
    void testSearchWithNullUpcomingEventCount() {
        // Chercher l'organisateur avec upcomingEventCount null
        OrganizerSearchResult result = service.search("rando", 0, 10);

        assertNotNull(result);
        assertTrue(result.getContent().stream()
                .anyMatch(org -> org.getAssociationName().equals("Rando Aventure")),
                "Devrait gérer le null de upcomingEventCount");
    }

    @Test
    @Transactional
    void testSearchWithSpecificQuery() {
        // Chercher "escalade"
        OrganizerSearchResult result = service.search("escalade", 0, 10);

        assertNotNull(result);
        assertTrue(result.getContent().stream()
                .anyMatch(org -> "Société d'Escalade".equals(org.getAssociationName())),
                "Devrait trouver la Société d'Escalade");
    }

    @Test
    @Transactional
    void testSearchNoResults() {
        // Chercher avec un query qui ne correspondrait à rien
        OrganizerSearchResult result = service.search("zzzzzzzzz", 0, 10);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertEquals(0, result.getContent().size());
    }

    @Test
    @Transactional
    void testSearchWithVerifiedFilter() {
        // Chercher organisateurs vérifiés
        OrganizerSearchResult result = service.search(null, 0, 10);

        assertNotNull(result);
        // Vérifier que on a au moins les 2 organisateurs vérifiés
        assertTrue(result.getContent().stream()
                .filter(org -> Boolean.TRUE.equals(org.getVerified()))
                .count() >= 2);
    }

    @Test
    @Transactional
    void testSearchResultMapping() {
        OrganizerSearchResult result = service.search("club alpin", 0, 10);

        assertNotNull(result);
        assertTrue(result.getContent().size() > 0, "Devrait trouver le Club Alpin");

        var org = result.getContent().get(0);
        assertEquals("Club Alpin Français", org.getAssociationName());
        assertEquals(5, org.getUpcomingEventCount());
        assertTrue(org.getVerified());
        assertNotNull(org.getLogoUrl());
    }
}
