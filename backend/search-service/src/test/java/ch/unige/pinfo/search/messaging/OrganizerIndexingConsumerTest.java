package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.OrganizerDto;
import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.repository.OrganizerSearchRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
public class OrganizerIndexingConsumerTest {

    @Inject
    OrganizerIndexingConsumer consumer;

    @Inject
    OrganizerSearchRepository repository;

    private OrganizerDto sampleDto;
    private UUID userId;

    @BeforeEach
    void setup() {
        userId = UUID.randomUUID();
        sampleDto = new OrganizerDto();
        sampleDto.setUserId(userId);
        sampleDto.setAssociationName("Test Assoc");
        sampleDto.setDescription("Description");
        sampleDto.setLogoUrl("http://logo.com");
        sampleDto.setVerified(true);
        sampleDto.setUpcomingEventCount(5);
    }

    @Test
    void testConsumeOrganizerUpsert_NewOrganizer() {
        // Simuler que l'organisateur n'existe pas encore
        when(repository.findByIdOptional(userId)).thenReturn(Optional.empty());

        // Utilisation d'un ArgumentCaptor pour valider que le mapping interne a été
        // exécuté à 100%
        ArgumentCaptor<SearchOrganizer> captor = ArgumentCaptor.forClass(SearchOrganizer.class);

        consumer.consumeOrganizerUpsert(sampleDto);

        // Vérifier qu'on a bien appelé persist et inspecter l'objet mappé pour Sonar
        verify(repository, times(1)).persist(captor.capture());
        SearchOrganizer saved = captor.getValue();

        assertNotNull(saved);
        assertEquals(userId, saved.userId);
        assertEquals("Test Assoc", saved.associationName);
        assertEquals("http://logo.com", saved.logoUrl);
        assertTrue(saved.verified);
        assertEquals(5, saved.upcomingEventCount);
    }

    @Test
    void testConsumeOrganizerUpsert_ExistingOrganizer() {
        // Simuler qu'un organisateur existe déjà
        SearchOrganizer existing = new SearchOrganizer();
        existing.userId = userId;
        existing.associationName = "Ancien Nom";

        when(repository.findByIdOptional(userId)).thenReturn(Optional.of(existing));

        consumer.consumeOrganizerUpsert(sampleDto);

        // Vérifier que c'est le même objet qui est mis à jour (mutation) et persisté
        verify(repository, times(1)).persist(existing);
        assertEquals("Test Assoc", existing.associationName); // Le nom a dû changer
    }

    @Test
    void testConsumeOrganizerUpsert_HandleExceptionOnPersist() {
        // Au lieu de faire planter findByIdOptional, on fait planter persist().
        // De cette façon, tout le code de mapping est exécuté ET le catch est exécuté.
        // -> 100% de couverture sur la méthode
        when(repository.findByIdOptional(userId)).thenReturn(Optional.empty());
        doThrow(new RuntimeException("Database write error")).when(repository).persist(any(SearchOrganizer.class));

        // On vérifie que la méthode gère l'exception sans la propager
        assertDoesNotThrow(() -> consumer.consumeOrganizerUpsert(sampleDto));
    }

    @Test
    void testConsumeOrganizerDeletion() {
        String userIdStr = userId.toString();

        // On s'assure que la suppression s'exécute sans encombre
        assertDoesNotThrow(() -> consumer.consumeOrganizerDeletion(userIdStr));

        verify(repository, times(1)).deleteById(userId);
    }

    @Test
    void testConsumeOrganizerUpsert_NullUpcomingEventCount() {
        sampleDto.setUpcomingEventCount(null);
        when(repository.findByIdOptional(userId)).thenReturn(Optional.empty());

        ArgumentCaptor<SearchOrganizer> captor = ArgumentCaptor.forClass(SearchOrganizer.class);

        consumer.consumeOrganizerUpsert(sampleDto);

        verify(repository, times(1)).persist(captor.capture());
        // Null gets mapped to the default value 0
        assertEquals(0, captor.getValue().upcomingEventCount);
    }
}