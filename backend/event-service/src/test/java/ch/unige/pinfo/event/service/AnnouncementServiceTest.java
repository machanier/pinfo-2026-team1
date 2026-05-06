package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
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
class AnnouncementServiceTest {

    @Inject
    AnnouncementService announcementService;

    @Inject
    AnnouncementRepository announcementRepository;

    @Inject
    EventRepository eventRepository;

    private UUID organizerId;
    private UUID otherOrganizerId;
    private UUID eventId;
    private Event event;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clear database before each test to ensure isolation
        announcementRepository.deleteAll();
        eventRepository.deleteAll();

        organizerId = UUID.randomUUID();
        otherOrganizerId = UUID.randomUUID();

        // Create a published event owned by organizerId
        event = new Event();
        event.organizerId = organizerId;
        event.status = EventStatus.PUBLISHED;
        event.title = "Test Event";
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(event);
        eventId = event.eventId;
    }

    // ********** Missing/Null Fields **********

    @Test
    @Transactional
    void createAnnouncementWithNullRequestThrows() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(null));

        assertEquals("Announcement payload is required", exception.getMessage());
    }

    @Test
    @Transactional
    void createAnnouncementWithNullEventIdThrows() {
        Announcement request = new Announcement();
        request.eventId = null;
        request.organizerId = organizerId;
        request.body = "Test announcement";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertEquals("Event ID is required", exception.getMessage());
    }

    @Test
    @Transactional
    void createAnnouncementWithNullOrganizerIdThrows() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = null;
        request.body = "Test announcement";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertEquals("Organizer ID is required", exception.getMessage());
    }

    @Test
    @Transactional
    void createAnnouncementWithNullBodyThrows() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = null;

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertEquals("Announcement body is required", exception.getMessage());
    }

    @Test
    @Transactional
    void createAnnouncementWithBlankBodyThrows() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "   ";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertEquals("Announcement body is required", exception.getMessage());
    }

    @Test
    @Transactional
    void createAnnouncementWithEmptyBodyThrows() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertEquals("Announcement body is required", exception.getMessage());
    }

    // ********** Incorrect field values **********

    @Test
    @Transactional
    void createAnnouncementWithBodyExceedingMaxLengthThrows() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        // Create a string with 2001 characters (exceeds max of 2000)
        request.body = "a".repeat(2001);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertEquals("Announcement body must not exceed 2000 characters", exception.getMessage());
    }

    @Test
    @Transactional
    void createAnnouncementWithNonExistentEventThrows() {
        UUID nonExistentEventId = UUID.randomUUID();

        Announcement request = new Announcement();
        request.eventId = nonExistentEventId;
        request.organizerId = organizerId;
        request.body = "Test announcement";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertTrue(exception.getMessage().contains("Event not found"));
        assertTrue(exception.getMessage().contains(nonExistentEventId.toString()));
    }

    // ********** Authorization **********

    @Test
    @Transactional
    void createAnnouncementWithDifferentOrganizerThrows() {
        // Try to post an announcement as a different organizer than the event owner
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = otherOrganizerId;
        request.body = "Unauthorized announcement";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));

        assertEquals("Only the event organizer can post announcements", exception.getMessage());
    }

    // ********** All fields correct **********

    @Test
    @Transactional
    void createAnnouncementSuccessfully() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "Important: Room changed to Building B";

        Announcement created = announcementService.createAnnouncement(request);

        assertNotNull(created);
        assertNotNull(created.announcementId, "Announcement ID should be auto-generated");
        assertEquals(eventId, created.eventId);
        assertEquals(organizerId, created.organizerId);
        assertEquals("Important: Room changed to Building B", created.body);
        assertNotNull(created.postedAt, "postedAt should be set by @PrePersist");
    }

    @Test
    @Transactional
    void createdAnnouncementCanBeRetrieved() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "Test announcement for retrieval";

        Announcement created = announcementService.createAnnouncement(request);
        UUID announcementId = created.announcementId;

        // Retrieve it from the database
        Announcement retrieved = announcementRepository.findByIdOptional(announcementId)
                .orElseThrow(() -> new AssertionError("Announcement not found in database"));

        assertEquals(announcementId, retrieved.announcementId);
        assertEquals(eventId, retrieved.eventId);
        assertEquals(organizerId, retrieved.organizerId);
        assertEquals("Test announcement for retrieval", retrieved.body);
    }

    @Test
    @Transactional
    void createMultipleAnnouncementsForSameEvent() {
        Announcement request1 = new Announcement();
        request1.eventId = eventId;
        request1.organizerId = organizerId;
        request1.body = "First announcement";

        Announcement request2 = new Announcement();
        request2.eventId = eventId;
        request2.organizerId = organizerId;
        request2.body = "Second announcement";

        Announcement created1 = announcementService.createAnnouncement(request1);
        Announcement created2 = announcementService.createAnnouncement(request2);

        assertNotEquals(created1.announcementId, created2.announcementId, "Each announcement should have a unique ID");
        assertEquals(eventId, created1.eventId);
        assertEquals(eventId, created2.eventId);
        assertEquals("First announcement", created1.body);
        assertEquals("Second announcement", created2.body);
    }

    // ********** Edge cases **********

    @Test
    @Transactional
    void createAnnouncementWithLeadingAndTrailingWhitespaceTrims() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "  \n  Trimmed announcement  \t  ";

        Announcement created = announcementService.createAnnouncement(request);

        assertEquals("Trimmed announcement", created.body, "Body should be trimmed of leading/trailing whitespace");
    }

    @Test
    @Transactional
    void createAnnouncementWithBodyAtMaxLengthBoundarySucceeds() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        // Create a string with exactly 2000 characters (at max boundary)
        request.body = "a".repeat(2000);

        Announcement created = announcementService.createAnnouncement(request);

        assertNotNull(created.announcementId);
        assertEquals(2000, created.body.length());
    }

    @Test
    @Transactional
    void createAnnouncementWithSpecialCharactersInBody() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "🎉 Event update: ! @ #";

        Announcement created = announcementService.createAnnouncement(request);

        assertEquals("🎉 Event update: ! @ #", created.body);
        assertNotNull(created.announcementId);
    }

    @Test
    @Transactional
    void createAnnouncementForDraftEventSucceeds() {
        // Create a draft event
        Event draftEvent = new Event();
        draftEvent.organizerId = organizerId;
        draftEvent.status = EventStatus.DRAFT;
        draftEvent.title = "Draft Event";
        draftEvent.place = "Room 101";
        draftEvent.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(draftEvent);

        Announcement request = new Announcement();
        request.eventId = draftEvent.eventId;
        request.organizerId = organizerId;
        request.body = "Announcement for draft event";

        // Should succeed. No status validation at service level
        Announcement created = announcementService.createAnnouncement(request);

        assertNotNull(created.announcementId);
        assertEquals(draftEvent.eventId, created.eventId);
    }

    @Test
    @Transactional
    void createAnnouncementForCancelledEventSucceeds() {
        // Create a cancelled event
        Event cancelledEvent = new Event();
        cancelledEvent.organizerId = organizerId;
        cancelledEvent.status = EventStatus.CANCELLED;
        cancelledEvent.title = "Cancelled Event";
        cancelledEvent.place = "Room 101";
        cancelledEvent.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(cancelledEvent);

        Announcement request = new Announcement();
        request.eventId = cancelledEvent.eventId;
        request.organizerId = organizerId;
        request.body = "Cancellation announcement";

        // No status validation at service level
        Announcement created = announcementService.createAnnouncement(request);

        assertNotNull(created.announcementId);
        assertEquals(cancelledEvent.eventId, created.eventId);
    }
}
