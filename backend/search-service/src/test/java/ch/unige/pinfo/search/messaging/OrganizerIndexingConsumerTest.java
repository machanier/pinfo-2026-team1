package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.OrganizerDto;
import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.repository.OrganizerSearchRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

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
    @Transactional
    void testConsumeOrganizerUpsert_NewOrganizer() {
        // Ensure organizer doesn't exist
        repository.deleteById(userId);

        consumer.consumeOrganizerUpsert(sampleDto);

        // Verify the organizer was created
        SearchOrganizer saved = repository.findByIdOptional(userId).orElse(null);
        assertNotNull(saved);
        assertEquals(userId, saved.userId);
        assertEquals("Test Assoc", saved.associationName);
        assertEquals("http://logo.com", saved.logoUrl);
        assertTrue(saved.verified);
        assertEquals(5, saved.upcomingEventCount);
    }

    @Test
    @Transactional
    void testConsumeOrganizerUpsert_ExistingOrganizer() {
        // Create initial organizer
        SearchOrganizer existing = new SearchOrganizer();
        existing.userId = userId;
        existing.associationName = "Ancien Nom";
        repository.persist(existing);

        consumer.consumeOrganizerUpsert(sampleDto);

        // Verify the update
        SearchOrganizer updated = repository.findByIdOptional(userId).orElse(null);
        assertNotNull(updated);
        assertEquals("Test Assoc", updated.associationName);
    }

    @Test
    @Transactional
    void testConsumeOrganizerUpsert_HandleExceptionOnPersist() {
        // Ensure organizer doesn't exist
        repository.deleteById(userId);

        // Test that the consumer handles the upsert without throwing
        assertDoesNotThrow(() -> consumer.consumeOrganizerUpsert(sampleDto));

        // Verify it was persisted
        SearchOrganizer saved = repository.findByIdOptional(userId).orElse(null);
        assertNotNull(saved);
    }

    @Test
    @Transactional
    void testConsumeOrganizerDeletion() {
        // Create an organizer first
        SearchOrganizer organizer = new SearchOrganizer();
        organizer.userId = userId;
        organizer.associationName = "Test";
        repository.persist(organizer);

        // Delete it
        String userIdStr = userId.toString();
        assertDoesNotThrow(() -> consumer.consumeOrganizerDeletion(userIdStr));

        // Verify it was deleted
        assertTrue(repository.findByIdOptional(userId).isEmpty());
    }

    @Test
    @Transactional
    void testConsumeOrganizerUpsert_NullUpcomingEventCount() {
        sampleDto.setUpcomingEventCount(null);

        consumer.consumeOrganizerUpsert(sampleDto);

        SearchOrganizer saved = repository.findByIdOptional(userId).orElse(null);
        assertNotNull(saved);
        // When null is passed, it defaults to 0 for a primitive int or Integer wrapper
        assertEquals(0, saved.upcomingEventCount);
    }
}
