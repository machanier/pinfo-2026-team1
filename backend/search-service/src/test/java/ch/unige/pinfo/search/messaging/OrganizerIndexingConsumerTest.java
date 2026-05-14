package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.OrganizerDto;
import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.repository.OrganizerSearchRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
public class OrganizerIndexingConsumerTest {

    @Inject
    OrganizerIndexingConsumer consumer;

    @InjectMock
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
        sampleDto.setVerified(true);
        sampleDto.setUpcomingEventCount(5);
    }

    @Test
    void testConsumeOrganizerUpsert_NewOrganizer() {
        // Simuler que l'organisateur n'existe pas encore
        when(repository.findByIdOptional(userId)).thenReturn(Optional.empty());

        consumer.consumeOrganizerUpsert(sampleDto);

        // Vérifier qu'on a bien appelé persist
        verify(repository, times(1)).persist(any(SearchOrganizer.class));
    }

    @Test
    void testConsumeOrganizerUpsert_ExistingOrganizer() {
        // Simuler qu'un organisateur existe déjà
        SearchOrganizer existing = new SearchOrganizer();
        existing.userId = userId;
        when(repository.findByIdOptional(userId)).thenReturn(Optional.of(existing));

        consumer.consumeOrganizerUpsert(sampleDto);

        // Vérifier que c'est le même objet qui est mis à jour et persisté
        verify(repository, times(1)).persist(existing);
    }

    @Test
    void testConsumeOrganizerUpsert_HandleException() {
        // Simuler une erreur lors de la recherche
        when(repository.findByIdOptional(any())).thenThrow(new RuntimeException("DB Error"));

        // On vérifie que la méthode ne propage pas l'exception (grâce au try/catch)
        consumer.consumeOrganizerUpsert(sampleDto);

        // Si on arrive ici sans exception, le test passe et Sonar voit que le catch est
        // couvert
    }

    @Test
    void testConsumeOrganizerDeletion() {
        String userIdStr = userId.toString();

        consumer.consumeOrganizerDeletion(userIdStr);

        verify(repository, times(1)).deleteById(userId);
    }
}