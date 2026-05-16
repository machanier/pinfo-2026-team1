package ch.unige.pinfo.search.repository;

import ch.unige.pinfo.search.model.SearchEvent;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class SearchEventRepositoryTest {

    @Inject
    SearchEventRepository repository;

    private UUID eventId;

    @BeforeEach
    void setup() {
        eventId = UUID.randomUUID();
    }

    @Test
    @Transactional
    void testPersistAndFindByEventId() {
        // Arrange
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Test Event";
        event.description = "Test Description";
        event.capacity = 100;
        event.registeredCount = 50;
        event.isFull = false;

        // Act
        repository.persist(event);

        // Assert
        SearchEvent found = repository.findByEventId(eventId);
        assertNotNull(found);
        assertEquals("Test Event", found.title);
        assertEquals("Test Description", found.description);
        assertEquals(100, found.capacity);
        assertEquals(50, found.registeredCount);
    }

    @Test
    @Transactional
    void testFindByEventId_NotFound() {
        // Act
        SearchEvent found = repository.findByEventId(UUID.randomUUID());

        // Assert
        assertNull(found);
    }

    @Test
    @Transactional
    void testDeleteByEventId_Success() {
        // Arrange
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Event to Delete";
        repository.persist(event);

        // Act
        boolean deleted = repository.deleteByEventId(eventId);

        // Assert
        assertTrue(deleted);
        assertNull(repository.findByEventId(eventId));
    }

    @Test
    @Transactional
    void testDeleteByEventId_NotFound() {
        // Act
        boolean deleted = repository.deleteByEventId(UUID.randomUUID());

        // Assert
        assertFalse(deleted);
    }

    @Test
    @Transactional
    void testPersistAndUpdate() {
        // Arrange
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Initial Title";
        event.capacity = 50;
        event.registeredCount = 10;
        repository.persist(event);

        // Act - Retrieve and update
        SearchEvent found = repository.findByEventId(eventId);
        assertNotNull(found);
        found.title = "Updated Title";
        found.capacity = 100;
        found.registeredCount = 75;
        repository.persist(found);

        // Assert
        SearchEvent updated = repository.findByEventId(eventId);
        assertEquals("Updated Title", updated.title);
        assertEquals(100, updated.capacity);
        assertEquals(75, updated.registeredCount);
    }

    @Test
    @Transactional
    void testPersistEvent_WithAllFields() {
        // Arrange
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Complete Event";
        event.description = "A complete event with all fields";
        event.place = "Room 101";
        event.time = OffsetDateTime.now();
        event.endTime = OffsetDateTime.now().plusHours(2);
        event.category = "Workshop";
        event.organizerId = UUID.randomUUID();
        event.organizerName = "Test Organizer";
        event.capacity = 50;
        event.registeredCount = 30;
        event.isFull = false;

        // Act
        repository.persist(event);

        // Assert
        SearchEvent found = repository.findByEventId(eventId);
        assertNotNull(found);
        assertEquals("Complete Event", found.title);
        assertEquals("A complete event with all fields", found.description);
        assertEquals("Room 101", found.place);
        assertEquals("Workshop", found.category);
        assertEquals("Test Organizer", found.organizerName);
        assertFalse(found.isFull);
    }

    @Test
    @Transactional
    void testIsFull_Calculation() {
        // Arrange
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Full Event";
        event.capacity = 20;
        event.registeredCount = 20;
        event.isFull = true;

        // Act
        repository.persist(event);

        // Assert
        SearchEvent found = repository.findByEventId(eventId);
        assertNotNull(found);
        assertTrue(found.isFull);
    }

    @Test
    @Transactional
    void testPersistMultipleEvents() {
        // Arrange
        UUID eventId1 = UUID.randomUUID();
        UUID eventId2 = UUID.randomUUID();

        SearchEvent event1 = new SearchEvent();
        event1.eventId = eventId1;
        event1.title = "Event 1";

        SearchEvent event2 = new SearchEvent();
        event2.eventId = eventId2;
        event2.title = "Event 2";

        // Act
        repository.persist(event1);
        repository.persist(event2);

        // Assert
        assertNotNull(repository.findByEventId(eventId1));
        assertNotNull(repository.findByEventId(eventId2));
        assertEquals("Event 1", repository.findByEventId(eventId1).title);
        assertEquals("Event 2", repository.findByEventId(eventId2).title);
    }
}
