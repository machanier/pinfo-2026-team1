package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.EventDto;
import ch.unige.pinfo.search.dto.KafkaEventMessage;
import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.repository.SearchEventRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class EventIndexingConsumerTest {

    @Inject
    EventIndexingConsumer consumer;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    SearchEventRepository repository;

    private KafkaEventMessage message;
    private UUID eventId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        EventDto eventDto = new EventDto();
        eventDto.setEventId(eventId);
        eventDto.setTitle("Soirée Escalade");
        eventDto.setOrganizerId(UUID.randomUUID());
        eventDto.setCapacity(20);
        eventDto.setRegisteredCount(5);

        message = new KafkaEventMessage();
        message.setEvent(eventDto);
        message.setAction("CREATED");
    }

    @Test
    @Transactional
    void testEventIndexConsume_UpsertNew() throws Exception {
        // Ensure the event doesn't exist
        repository.deleteByEventId(eventId);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        // Verify the event was created
        SearchEvent saved = repository.findByEventId(eventId);
        assertNotNull(saved);
        assertEquals("Soirée Escalade", saved.title);
        assertEquals(20, saved.capacity);
        assertEquals(5, saved.registeredCount);
        assertFalse(saved.isFull);
    }

    @Test
    @Transactional
    void testEventIndexConsume_DeleteAction() throws Exception {
        // First, create an event
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Test Event";
        repository.persist(event);

        // Now delete it
        message.setAction("DELETED");
        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        // Verify it was deleted
        SearchEvent deleted = repository.findByEventId(eventId);
        assertNull(deleted);
    }

    @Test
    @Transactional
    void testEventIndexConsume_IsFullLogic() throws Exception {
        message.getEvent().setCapacity(10);
        message.getEvent().setRegisteredCount(10);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        SearchEvent saved = repository.findByEventId(eventId);
        assertNotNull(saved);
        assertTrue(saved.isFull);
    }

    @Test
    @Transactional
    void testEventIndexConsume_InvalidJson() {
        // Should handle gracefully without throwing
        assertDoesNotThrow(() -> consumer.eventIndexConsume("invalid-json"));
    }

    @Test
    @Transactional
    void testEventIndexConsume_DeleteAction_NotFound() throws Exception {
        // Try to delete an event that doesn't exist - should not throw
        message.setAction("DELETED");
        message.getEvent().setEventId(UUID.randomUUID());

        String json = objectMapper.writeValueAsString(message);
        assertDoesNotThrow(() -> consumer.eventIndexConsume(json));
    }

    @Test
    @Transactional
    void testEventIndexConsume_UpsertExisting() throws Exception {
        // Create initial event
        SearchEvent existing = new SearchEvent();
        existing.eventId = eventId;
        existing.title = "Old Title";
        existing.capacity = 10;
        repository.persist(existing);

        // Update via consumer
        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        // Verify the update
        SearchEvent updated = repository.findByEventId(eventId);
        assertNotNull(updated);
        assertEquals("Soirée Escalade", updated.title);
        assertEquals(20, updated.capacity);
    }

    @Test
    @Transactional
    void testEventIndexConsume_NullCapacity() throws Exception {
        message.getEvent().setCapacity(null);
        message.getEvent().setRegisteredCount(null);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        SearchEvent saved = repository.findByEventId(eventId);
        assertNotNull(saved);
        assertFalse(saved.isFull);
    }

    @Test
    @Transactional
    void testEventIndexConsume_MissingEventData() throws Exception {
        message.setEvent(null);
        String json = objectMapper.writeValueAsString(message);

        // Should handle gracefully
        assertDoesNotThrow(() -> consumer.eventIndexConsume(json));
    }

    @Test
    @Transactional
    void testEventIndexConsume_CancelledAction() throws Exception {
        // Create initial event
        SearchEvent event = new SearchEvent();
        event.eventId = eventId;
        event.title = "Test Event";
        repository.persist(event);

        // Cancel it
        message.setAction("CANCELLED");
        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        // Verify it was deleted
        SearchEvent deleted = repository.findByEventId(eventId);
        assertNull(deleted);
    }

    @Test
    @Transactional
    void testIncomingChannels_delegateToConsume() throws Exception {
        // event-created channel -> upsert
        repository.deleteByEventId(eventId);
        String json = objectMapper.writeValueAsString(message);
        consumer.onEventCreated(json);
        assertNotNull(repository.findByEventId(eventId), "onEventCreated should index the event");

        // event-updated channel -> update existing
        message.getEvent().setTitle("Titre mis à jour");
        json = objectMapper.writeValueAsString(message);
        consumer.onEventUpdated(json);
        assertEquals("Titre mis à jour", repository.findByEventId(eventId).title,
                "onEventUpdated should update the indexed event");

        // event-cancelled channel -> remove from index
        message.setAction("CANCELLED");
        json = objectMapper.writeValueAsString(message);
        consumer.onEventCancelled(json);
        assertNull(repository.findByEventId(eventId), "onEventCancelled should remove the event");
    }

    @Test
    @Transactional
    void testEventIndexConsume_NonPublishedStatusRemovesFromIndex() throws Exception {
        // An event already indexed...
        SearchEvent existing = new SearchEvent();
        existing.eventId = eventId;
        existing.title = "Indexed Event";
        repository.persist(existing);

        // ...that arrives via event.updated with a non-PUBLISHED status (rejected back to
        // DRAFT, flagged to PENDING_MODERATION, etc.) must be dropped from the index so it
        // stops surfacing in search results.
        message.setAction("UPDATED");
        message.getEvent().setStatus("DRAFT");
        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        assertNull(repository.findByEventId(eventId),
                "A non-PUBLISHED event must be removed from the search index");
    }

    @Test
    @Transactional
    void testEventIndexConsume_PublishedStatusStaysIndexed() throws Exception {
        repository.deleteByEventId(eventId);

        message.setAction("UPDATED");
        message.getEvent().setStatus("PUBLISHED");
        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        assertNotNull(repository.findByEventId(eventId), "A PUBLISHED event must stay indexed");
    }
}
