package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class CalendarServiceTest {

    @Inject
    CalendarService calendarService;

    @Inject
    EventRepository eventRepository;

    private UUID organizerId1;
    private UUID organizerId2;
    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    @Transactional
    void setUp() {
        eventRepository.deleteAll();
        organizerId1 = UUID.randomUUID();
        organizerId2 = UUID.randomUUID();
        startDate = LocalDate.of(2026, 5, 1);
        endDate = LocalDate.of(2026, 5, 31);
    }

    @Test
    @Transactional
    void getCalendarEventsWithinDateRange() {
        OffsetDateTime withinRange = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        OffsetDateTime beforeRange = LocalDate.of(2026, 4, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        OffsetDateTime afterRange = LocalDate.of(2026, 6, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Within Range", withinRange);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "Before Range", beforeRange);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "After Range", afterRange);

        List<Event> results = calendarService.getEvents(startDate, endDate, null).list();

        assertEquals(1, results.size());
        assertEquals("Within Range", results.get(0).title);
    }

    @Test
    @Transactional
    void getCalendarEventsOnlyPublished() {
        OffsetDateTime eventTime = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Published Event", eventTime);
        persistEvent(organizerId1, EventStatus.DRAFT, "Draft Event", eventTime);
        persistEvent(organizerId1, EventStatus.CANCELLED, "Cancelled Event", eventTime);

        List<Event> results = calendarService.getEvents(startDate, endDate, null).list();

        assertEquals(1, results.size());
        assertEquals(EventStatus.PUBLISHED, results.get(0).status);
    }

    @Test
    @Transactional
    void getCalendarEventsFilterByOrganizer() {
        OffsetDateTime eventTime = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Event 1", eventTime);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "Event 2", eventTime);
        persistEvent(organizerId2, EventStatus.PUBLISHED, "Event 3", eventTime);

        List<Event> results = calendarService.getEvents(startDate, endDate, organizerId1).list();

        assertEquals(2, results.size());
        for (Event event : results) {
            assertEquals(organizerId1, event.organizerId);
        }
    }

    @Test
    @Transactional
    void getCalendarEventsAtBoundaryDates() {
        OffsetDateTime startTime = startDate.atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        OffsetDateTime endTime = endDate.atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Start Date Event", startTime);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "End Date Event", endTime);

        List<Event> results = calendarService.getEvents(startDate, endDate, null).list();

        assertEquals(2, results.size());
    }

    @Test
    @Transactional
    void getCalendarEventsWithOrganizerAndDateFiltering() {
        OffsetDateTime eventTime = LocalDate.of(2026, 5, 15).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        persistEvent(organizerId1, EventStatus.PUBLISHED, "Event A", eventTime);
        persistEvent(organizerId1, EventStatus.PUBLISHED, "Event B", eventTime);
        persistEvent(organizerId2, EventStatus.PUBLISHED, "Event C", eventTime);

        List<Event> results = calendarService.getEvents(startDate, endDate, organizerId1).list();

        assertEquals(2, results.size());
        for (Event event : results) {
            assertEquals(organizerId1, event.organizerId);
        }
    }

    @Test
    @Transactional
    void getCalendarEventsEmptyResult() {
        List<Event> results = calendarService.getEvents(startDate, endDate, null).list();
        assertEquals(0, results.size());
    }

    @Transactional
    Event persistEvent(UUID organizerId, EventStatus status, String title, OffsetDateTime time) {
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = status;
        event.title = title;
        event.place = "Room 101";
        event.time = time;
        eventRepository.persist(event);
        return event;
    }
}
