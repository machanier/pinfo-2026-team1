package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.model.EligibilityRule;
import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.model.EventRegistrationCount;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.openapi.model.AnnouncementStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
import ch.unige.pinfo.event.repository.EventRegistrationCountRepository;
import ch.unige.pinfo.event.messaging.EventChangePublisher;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class EventServiceTest {

    @Inject
    EventService eventService;

    @Inject
    EventRepository eventRepository;

    @Inject
    AnnouncementRepository announcementRepository;

    @Inject
    EventRegistrationCountRepository registrationCountRepository;

    @InjectMock
    EventChangePublisher eventPublisher;

    private UUID organizerId1;
    private UUID organizerId2;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clear database before each test to ensure isolation
        eventRepository.deleteAll();
        reset(eventPublisher);

        organizerId1 = UUID.randomUUID();
        organizerId2 = UUID.randomUUID();
    }

    @Test
    @Transactional
    void getEventsWithNoFilters() {
        // Create test events
        createEvent(organizerId1, EventStatus.DRAFT, "Draft Event");
        createEvent(organizerId2, EventStatus.PUBLISHED, "Published Event");

        List<Event> results = eventService.getEvents(null, null, null).list();

        assertEquals(2, results.size());
    }

    @Test
    @Transactional
    void getEventsFilterByOrganizerIdOnly() {
        createEvent(organizerId1, EventStatus.DRAFT, "Event 1");
        createEvent(organizerId1, EventStatus.PUBLISHED, "Event 2");
        createEvent(organizerId2, EventStatus.DRAFT, "Event 3");

        List<Event> results = eventService.getEvents(organizerId1, null, null).list();

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

        List<Event> results = eventService.getEvents(null, EventStatus.DRAFT, null).list();

        assertEquals(2, results.size());
        for (Event event : results) {
            assertEquals(EventStatus.DRAFT, event.status);
        }
    }

    @Test
    @Transactional
    void getEventsFilterByPendingModerationOnly() {
        createEvent(organizerId1, EventStatus.PENDING_MODERATION, "Pending 1");
        createEvent(organizerId2, EventStatus.PENDING_MODERATION, "Pending 2");
        createEvent(organizerId1, EventStatus.DRAFT, "Draft 1");

        List<Event> results = eventService.getEvents(null, EventStatus.PENDING_MODERATION, null).list();

        assertEquals(2, results.size());
        for (Event event : results) {
            assertEquals(EventStatus.PENDING_MODERATION, event.status);
        }
    }

    @Test
    @Transactional
    void getEventsFilterByCancelledOnly() {
        createEvent(organizerId1, EventStatus.CANCELLED, "Cancelled 1");
        createEvent(organizerId2, EventStatus.CANCELLED, "Cancelled 2");
        createEvent(organizerId1, EventStatus.PUBLISHED, "Published 1");

        List<Event> results = eventService.getEvents(null, EventStatus.CANCELLED, null).list();

        assertEquals(2, results.size());
        for (Event event : results) {
            assertEquals(EventStatus.CANCELLED, event.status);
        }
    }

    @Test
    @Transactional
    void getEventsFilterByBothOrganizerAndStatus() {
        createEvent(organizerId1, EventStatus.DRAFT, "Draft 1");
        createEvent(organizerId1, EventStatus.PUBLISHED, "Published 1");
        createEvent(organizerId2, EventStatus.DRAFT, "Draft 2");
        createEvent(organizerId2, EventStatus.PUBLISHED, "Published 2");

        List<Event> results = eventService.getEvents(organizerId1, EventStatus.PUBLISHED, null).list();

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
        verify(eventPublisher).eventCancelled(event.eventId, event.organizerId);
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
    void deleteDraftEventRemovesItWithoutPublishingCancelled() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Draft to delete");

        eventService.deleteEvent(event.eventId);

        assertEquals(0L, eventRepository.count("eventId", event.eventId));
        // A draft was never visible downstream — there is nothing to announce.
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @Transactional
    void deletePublishedEventRemovesItAndPublishesCancelled() {
        Event event = createEvent(organizerId1, EventStatus.PUBLISHED, "Published to delete");

        eventService.deleteEvent(event.eventId);

        assertEquals(0L, eventRepository.count("eventId", event.eventId));
        verify(eventPublisher).eventCancelled(event.eventId, organizerId1);
    }

    @Test
    @Transactional
    void deleteEventAlsoRemovesItsAnnouncementsAndRegistrationCount() {
        Event event = createEvent(organizerId1, EventStatus.PUBLISHED, "Has children");

        Announcement announcement = new Announcement();
        announcement.eventId = event.eventId;
        announcement.organizerId = organizerId1;
        announcement.status = AnnouncementStatus.PUBLISHED;
        announcement.body = "An announcement";
        announcementRepository.persist(announcement);

        EventRegistrationCount count = new EventRegistrationCount();
        count.eventId = event.eventId;
        count.registeredCount = 3;
        registrationCountRepository.persist(count);

        eventService.deleteEvent(event.eventId);

        // Bulk deletes leave the persistence context stale, so assert via count queries
        // (which hit the DB) rather than findById (which would read the stale cache).
        assertEquals(0L, eventRepository.count("eventId", event.eventId));
        assertEquals(0L, announcementRepository.count("eventId", event.eventId));
        assertEquals(0L, registrationCountRepository.count("eventId", event.eventId));
    }

    @Test
    @Transactional
    void markPendingModerationIsNoOpWhenAlreadyPending() {
        Event event = createEvent(organizerId1, EventStatus.PENDING_MODERATION, "Pending Event");

        Event updated = eventService.markPendingModeration(event.eventId);

        assertEquals(EventStatus.PENDING_MODERATION, updated.status);
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @Transactional
    void markPendingModerationMovesPublishedEventBackToPending() {
        Event event = createEvent(organizerId1, EventStatus.PUBLISHED, "Published Event");

        Event updated = eventService.markPendingModeration(event.eventId);

        assertEquals(EventStatus.PENDING_MODERATION, updated.status);
        verify(eventPublisher).eventUpdated(updated);
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
        verify(eventPublisher).eventUpdated(updated);
    }

    @Test
    @Transactional
    void applyModerationDecisionApprovedPublishesUpdate() {
        Event event = createEvent(organizerId1, EventStatus.PENDING_MODERATION, "Pending Event");

        eventService.applyModerationDecision(event.eventId, "APPROVED");

        Event updated = eventService.getEventById(event.eventId).orElseThrow();
        assertEquals(EventStatus.PUBLISHED, updated.status);
        verify(eventPublisher).eventUpdated(updated);
    }

    @Test
    @Transactional
    void applyModerationDecisionRejectedPublishesUpdate() {
        Event event = createEvent(organizerId1, EventStatus.PENDING_MODERATION, "Pending Event");

        eventService.applyModerationDecision(event.eventId, "REJECTED");

        Event updated = eventService.getEventById(event.eventId).orElseThrow();
        assertEquals(EventStatus.DRAFT, updated.status);
        verify(eventPublisher).eventUpdated(updated);
    }

    @Test
    @Transactional
    void applyModerationDecisionRejectedStoresReason() {
        Event event = createEvent(organizerId1, EventStatus.PENDING_MODERATION, "Pending Event");

        eventService.applyModerationDecision(event.eventId, "REJECTED", "Contenu inapproprié");

        Event updated = eventService.getEventById(event.eventId).orElseThrow();
        assertEquals(EventStatus.DRAFT, updated.status);
        assertEquals("Contenu inapproprié", updated.rejectionReason);
    }

    @Test
    @Transactional
    void applyModerationDecisionApprovedClearsReason() {
        Event event = createEvent(organizerId1, EventStatus.PENDING_MODERATION, "Pending Event");
        event.rejectionReason = "Previous rejection";
        eventRepository.persist(event);

        eventService.applyModerationDecision(event.eventId, "APPROVED");

        Event updated = eventService.getEventById(event.eventId).orElseThrow();
        assertEquals(EventStatus.PUBLISHED, updated.status);
        assertNull(updated.rejectionReason);
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

    @Test
    @Transactional
    void updateEventTimeAndEndTime() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Time Test");
        OffsetDateTime originalTime = event.time;

        // PostgreSQL/H2 stockent OffsetDateTime à la microseconde; OffsetDateTime.now()
        // peut produire des nanos. On tronque pour aligner avec ce que la DB renverra.
        OffsetDateTime newTime = OffsetDateTime.now().plusDays(5).truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        OffsetDateTime newEndTime = newTime.plusHours(2);

        Event updateData = new Event();
        updateData.time = newTime;
        updateData.endTime = newEndTime;

        Event updated = eventService.updateEvent(event.eventId, updateData);

        assertEquals(newTime, updated.time);
        assertEquals(newEndTime, updated.endTime);
        // Other fields unchanged
        assertEquals("Time Test", updated.title);
        assertNotEquals(originalTime, updated.time);
    }

    @Test
    @Transactional
    void updateEventCapacity() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Capacity Test");

        Event updateData = new Event();
        updateData.capacity = 150;

        Event updated = eventService.updateEvent(event.eventId, updateData);

        assertEquals(150, updated.capacity);
        assertEquals("Capacity Test", updated.title);
    }

    @Test
    @Transactional
    void updateEventCategory() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Category Test");

        Event updateData = new Event();
        updateData.category = "WORKSHOP";

        Event updated = eventService.updateEvent(event.eventId, updateData);

        assertEquals("WORKSHOP", updated.category);
        assertEquals("Category Test", updated.title);
    }

    @Test
    @Transactional
    void updateEventTags() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Tags Test");

        Event updateData = new Event();
        updateData.tags = List.of("java", "spring", "testing");

        Event updated = eventService.updateEvent(event.eventId, updateData);

        assertNotNull(updated.tags);
        assertEquals(3, updated.tags.size());
        assertTrue(updated.tags.contains("java"));
        assertTrue(updated.tags.contains("spring"));
        assertTrue(updated.tags.contains("testing"));
    }

    @Test
    @Transactional
    void updateEventRestrictedTo() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Restrictions Test");

        Event restrictionData = new Event();
        restrictionData.restrictedTo = new EligibilityRule();
        restrictionData.restrictedTo.majors = List.of("CS", "MATH");

        Event updated = eventService.updateEvent(event.eventId, restrictionData);

        assertNotNull(updated.restrictedTo);
        assertNotNull(updated.restrictedTo.majors);
        assertEquals(2, updated.restrictedTo.majors.size());
        assertTrue(updated.restrictedTo.majors.contains("CS"));
        assertTrue(updated.restrictedTo.majors.contains("MATH"));
    }

    @Test
    @Transactional
    void updateEventMultipleFieldsTogether() {
        Event event = createEvent(organizerId1, EventStatus.DRAFT, "Multi-field Update");

        // Même raison que updateEventTimeAndEndTime — tronquer aux micros.
        OffsetDateTime newTime = OffsetDateTime.now().plusDays(3).truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        Event updateData = new Event();
        updateData.title = "Updated Title";
        updateData.time = newTime;
        updateData.capacity = 200;
        updateData.category = "SEMINAR";
        updateData.tags = List.of("tech", "innovation");

        Event updated = eventService.updateEvent(event.eventId, updateData);

        assertEquals("Updated Title", updated.title);
        assertEquals(newTime, updated.time);
        assertEquals(200, updated.capacity);
        assertEquals("SEMINAR", updated.category);
        assertEquals(List.of("tech", "innovation"), updated.tags);
    }
}
