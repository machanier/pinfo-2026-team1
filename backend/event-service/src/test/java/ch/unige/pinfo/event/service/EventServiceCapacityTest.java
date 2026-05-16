package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.CapacityInfo;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class EventServiceCapacityTest {

    @Inject
    EventService eventService;

    @Inject
    EventRepository eventRepository;

    private UUID organizerId;

    @BeforeEach
    @Transactional
    void setUp() {
        eventRepository.deleteAll();
        organizerId = UUID.randomUUID();
    }

    @Test
    void getCapacityInfoThrowsForNonExistentEvent() {
        UUID nonExistentId = UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> eventService.getCapacityInfo(nonExistentId));

        assertTrue(ex.getMessage().contains("Event not found"));
    }

    @Test
    @Transactional
    void getCapacityInfoForUnlimitedEventHasNullSlots() {
        Event event = createEvent(null);

        CapacityInfo info = eventService.getCapacityInfo(event.eventId);

        assertNull(info.getCapacity());
        assertNull(info.getAvailableSlots());
        assertFalse(info.getIsFull());
    }

    @Test
    @Transactional
    void getCapacityInfoForUnlimitedEventRegisteredCountIsZero() {
        Event event = createEvent(null);

        CapacityInfo info = eventService.getCapacityInfo(event.eventId);

        assertEquals(0, info.getRegisteredCount());
    }

    @Test
    @Transactional
    void getCapacityInfoForLimitedEventHasCorrectAvailableSlots() {
        Event event = createEvent(100);

        CapacityInfo info = eventService.getCapacityInfo(event.eventId);

        assertEquals(100, info.getCapacity());
        assertEquals(0, info.getRegisteredCount());
        assertEquals(100, info.getAvailableSlots()); // capacity - registeredCount
        assertFalse(info.getIsFull());
    }

    @Test
    @Transactional
    void getCapacityInfoForZeroCapacityEventIsAlwaysFull() {
        // An event with capacity 0 is full before anyone registers
        Event event = createEvent(0);

        CapacityInfo info = eventService.getCapacityInfo(event.eventId);

        assertEquals(0, info.getCapacity());
        assertEquals(0, info.getAvailableSlots());
        assertTrue(info.getIsFull()); // registeredCount (0) >= capacity (0)
    }

    @Test
    @Transactional
    void getCapacityInfoEventIdMatchesRequested() {
        Event event = createEvent(20);

        CapacityInfo info = eventService.getCapacityInfo(event.eventId);

        assertEquals(event.eventId, info.getEventId());
    }

    @Test
    @Transactional
    void getCapacityInfoWorksForDraftEvent() {
        Event event = createEventWithStatus(EventStatus.DRAFT, 10);

        CapacityInfo info = eventService.getCapacityInfo(event.eventId);

        assertNotNull(info);
        assertEquals(10, info.getCapacity());
        assertFalse(info.getIsFull());
    }

    @Test
    @Transactional
    void getCapacityInfoWorksForCancelledEvent() {
        Event event = createEventWithStatus(EventStatus.CANCELLED, 30);

        CapacityInfo info = eventService.getCapacityInfo(event.eventId);

        assertNotNull(info);
        assertEquals(30, info.getCapacity());
        assertEquals(30, info.getAvailableSlots());
    }

    // ******** Helpers ********

    private Event createEvent(Integer capacity) {
        return createEventWithStatus(EventStatus.PUBLISHED, capacity);
    }

    private Event createEventWithStatus(EventStatus status, Integer capacity) {
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = status;
        event.title = "Test Event";
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        event.capacity = capacity;
        eventRepository.persist(event);
        return event;
    }
}
