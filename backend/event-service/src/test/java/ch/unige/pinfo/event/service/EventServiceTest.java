package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class EventServiceTest {

    @Inject
    EventService eventService;

    @Inject
    EventRepository eventRepository;

    private UUID organizerId1;
    private UUID organizerId2;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clear database before each test to ensure isolation
        eventRepository.deleteAll();

        organizerId1 = UUID.randomUUID();
        organizerId2 = UUID.randomUUID();
    }

    @Test
    @Transactional
    void getEventsWithNoFilters() {
        // Create test events
        createEvent(organizerId1, EventStatus.DRAFT, "Draft Event");
        createEvent(organizerId2, EventStatus.PUBLISHED, "Published Event");

        List<Event> results = eventService.getEvents(null, null).list();

        assertEquals(2, results.size());
    }

    @Test
    @Transactional
    void getEventsFilterByOrganizerIdOnly() {
        createEvent(organizerId1, EventStatus.DRAFT, "Event 1");
        createEvent(organizerId1, EventStatus.PUBLISHED, "Event 2");
        createEvent(organizerId2, EventStatus.DRAFT, "Event 3");

        List<Event> results = eventService.getEvents(organizerId1, null).list();

        assertEquals(2, results.size());
        for (Event event : results) {
            assertEquals(organizerId1, event.organizerId);
        }
    }

    @Test
    @Transactional
    void getEventsFilterByStatusOnly() {
        createEvent(organizerId1, EventStatus.DRAFT, "Draft 1");
        createEvent(organizerId2, EventStatus.DRAFT, "Draft 2");
        createEvent(organizerId1, EventStatus.PUBLISHED, "Published 1");

        List<Event> results = eventService.getEvents(null, EventStatus.DRAFT).list();

        assertEquals(2, results.size());
        for (Event event : results) {
            assertEquals(EventStatus.DRAFT, event.status);
        }
    }

    @Test
    @Transactional
    void getEventsFilterByBothOrganizerAndStatus() {
        createEvent(organizerId1, EventStatus.DRAFT, "Draft 1");
        createEvent(organizerId1, EventStatus.PUBLISHED, "Published 1");
        createEvent(organizerId2, EventStatus.DRAFT, "Draft 2");
        createEvent(organizerId2, EventStatus.PUBLISHED, "Published 2");

        List<Event> results = eventService.getEvents(organizerId1, EventStatus.PUBLISHED).list();

        assertEquals(1, results.size());
        Event event = results.get(0);
        assertEquals(organizerId1, event.organizerId);
        assertEquals(EventStatus.PUBLISHED, event.status);
        assertEquals("Published 1", event.title);
    }

    private Event createEvent(UUID organizerId, EventStatus status, String title) {
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = status;
        event.title = title;
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(event);
        return event;
    }

    @Test
    @Transactional
    void cancelEventSuccessfully() {
        Event event = createEvent(organizerId1, EventStatus.PUBLISHED, "Cancellable Event");
        Event cancelled = eventService.cancelEvent(event.eventId);

        assertEquals(EventStatus.CANCELLED, cancelled.status);
        assertEquals(event.eventId, cancelled.eventId);
    }

    @Test
    @Transactional
    void cancelNonExistentEventThrows() {
        UUID nonExistentId = UUID.randomUUID();

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> eventService.cancelEvent(nonExistentId));

        assertTrue(exception.getMessage().contains("Event not found"));
    }

    @Test
    @Transactional
    void cancelDraftEventThrows() {
        // Create a draft event (invalid state for cancellation)
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Draft Event");

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> eventService.cancelEvent(event.eventId));

        assertNotNull(exception.getMessage());
    }

    @Test
    @Transactional
    void updateEventSuccessfully() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Original Title");

        Event updateData = new Event();
        updateData.title = "Updated Title";
        updateData.place = "Room 202";
        updateData.description = "New description";

        Event updated = eventService.updateEvent(event.eventId, updateData);

        assertEquals("Updated Title", updated.title);
        assertEquals("Room 202", updated.place);
        assertEquals("New description", updated.description);
        // Original fields not in updateData should remain unchanged
        assertEquals(organizerId1, updated.organizerId);
        assertEquals(EventStatus.DRAFT, updated.status);
    }

    @Test
    @Transactional
    void updateNonExistentEventThrows() {
        UUID nonExistentId = UUID.randomUUID();
        Event updateData = new Event();
        updateData.title = "Updated";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> eventService.updateEvent(nonExistentId, updateData));

        assertTrue(exception.getMessage().contains("Event not found"));
    }

    @Test
    @Transactional
    void updateEventPartialFields() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Original Title");
        String originalPlace = event.place;

        Event updateData = new Event();
        updateData.title = "New Title";
        // Don't update place, description, etc.

        Event updated = eventService.updateEvent(event.eventId, updateData);

        assertEquals("New Title", updated.title);
        assertEquals(originalPlace, updated.place); // Should remain unchanged
        assertNull(updated.description); // Should remain null
    }
}
