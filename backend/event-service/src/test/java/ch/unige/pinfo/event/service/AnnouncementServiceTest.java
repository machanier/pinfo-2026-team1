package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.messaging.AnnouncementChangePublisher;
import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.AnnouncementStatus;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.OffsetDateTime;
import java.util.List;
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

    @InjectMock
    AnnouncementChangePublisher announcementPublisher;

    private UUID organizerId;
    private UUID otherOrganizerId;
    private UUID eventId;
    private Event event;

    @BeforeEach
    @Transactional
    void setUp() {
        announcementRepository.deleteAll();
        eventRepository.deleteAll();

        organizerId = UUID.randomUUID();
        otherOrganizerId = UUID.randomUUID();

        // Create initial base event ensuring all non-null DB columns are filled
        event = new Event();
        event.organizerId = organizerId;
        event.status = EventStatus.PUBLISHED;
        event.title = "Test Event";
        event.place = "Room 101";
        event.time = OffsetDateTime.now().plusDays(1);
        eventRepository.persist(event);
        eventId = event.eventId;
    }

    // Helper method to safely instantiate valid events on the fly without breaking
    // DB constraints
    private Event createTestEvent(UUID ownerId, EventStatus status, String title) {
        Event newEvent = new Event();
        newEvent.organizerId = ownerId;
        newEvent.status = status;
        newEvent.title = title;
        newEvent.place = "Backup Room 102";
        newEvent.time = OffsetDateTime.now().plusDays(2);
        eventRepository.persist(newEvent);
        return newEvent;
    }

    // ********** Missing/Null Fields (Creation) **********

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

    @Test
    @Transactional
    void createAnnouncementWithBodyExceedingMaxLengthThrows() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
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
    }

    @Test
    @Transactional
    void createAnnouncementWithDifferentOrganizerThrows() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = otherOrganizerId;
        request.body = "Unauthorized announcement";

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.createAnnouncement(request));
        assertEquals("Only the event organizer can post announcements", exception.getMessage());
    }

    @Test
    @Transactional
    void createAnnouncementSuccessfully() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "Important: Room changed to Building B";

        Announcement created = announcementService.createAnnouncement(request);

        assertNotNull(created);
        assertNotNull(created.announcementId);
        assertEquals(AnnouncementStatus.DRAFT, created.status);
        Mockito.verify(announcementPublisher, Mockito.times(1)).announcementSubmitted(Mockito.any());
    }

    @Test
    @Transactional
    void createAnnouncementWithLeadingAndTrailingWhitespaceTrims() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "   Trimmed announcement   ";

        Announcement created = announcementService.createAnnouncement(request);
        assertEquals("Trimmed announcement", created.body);
    }

    @Test
    @Transactional
    void createAnnouncementWithBodyAtMaxLengthBoundarySucceeds() {
        Announcement request = new Announcement();
        request.eventId = eventId;
        request.organizerId = organizerId;
        request.body = "a".repeat(2000);

        Announcement created = announcementService.createAnnouncement(request);
        assertEquals(2000, created.body.length());
    }

    @Test
    @Transactional
    void createAnnouncementForDraftEventSucceeds() {
        Event draftEvent = createTestEvent(organizerId, EventStatus.DRAFT, "Draft Event");

        Announcement request = new Announcement();
        request.eventId = draftEvent.eventId;
        request.organizerId = organizerId;
        request.body = "Announcement for draft event";

        Announcement created = announcementService.createAnnouncement(request);
        assertNotNull(created.announcementId);
        assertEquals(draftEvent.eventId, created.eventId);
    }

    @Test
    @Transactional
    void createAnnouncementForCancelledEventSucceeds() {
        Event cancelledEvent = createTestEvent(organizerId, EventStatus.CANCELLED, "Cancelled Event");

        Announcement request = new Announcement();
        request.eventId = cancelledEvent.eventId;
        request.organizerId = organizerId;
        request.body = "Cancellation announcement";

        Announcement created = announcementService.createAnnouncement(request);
        assertNotNull(created.announcementId);
        assertEquals(cancelledEvent.eventId, created.eventId);
    }

    // ********** PUBLISH Announcement **********

    @Test
    @Transactional
    void publishAnnouncementWithNullIdThrows() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.publishAnnouncement(null));
        assertEquals("Announcement ID is required", exception.getMessage());
    }

    @Test
    @Transactional
    void publishAnnouncementForNonExistentAnnouncementThrows() {
        UUID nonExistentId = UUID.randomUUID();
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.publishAnnouncement(nonExistentId));
        assertTrue(exception.getMessage().contains("Announcement not found"));
    }

    @Test
    @Transactional
    void publishAnnouncementNotInDraftStatusThrows() {
        Announcement announcement = createAnnouncement("Already Published Test");
        announcement.status = AnnouncementStatus.PUBLISHED;
        announcementRepository.persist(announcement);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> announcementService.publishAnnouncement(announcement.announcementId));
        assertEquals("Announcement is not in DRAFT status", exception.getMessage());
    }

    @Test
    @Transactional
    void publishAnnouncementWithMissingEventThrows() {
        Announcement announcement = createAnnouncement("Orphaned Announcement");
        eventRepository.delete(event);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.publishAnnouncement(announcement.announcementId));
        assertTrue(exception.getMessage().contains("Event not found"));
    }

    @Test
    @Transactional
    void publishAnnouncementSuccessfully() {
        Announcement announcement = createAnnouncement("Going Live!");

        Announcement published = announcementService.publishAnnouncement(announcement.announcementId);

        assertEquals(AnnouncementStatus.PUBLISHED, published.status);
        assertNotNull(published.postedAt);
        Mockito.verify(announcementPublisher, Mockito.times(1)).announcementPosted(published);
    }

    // ********** GET Announcements by Event ID **********

    @Test
    @Transactional
    void getAnnouncementsByEventIdWithNullEventIdThrows() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.getAnnouncementsByEventId(null, 0, 20, organizerId, false));
        assertEquals("Event ID is required", exception.getMessage());
    }

    @Test
    @Transactional
    void getAnnouncementsByEventIdForNonExistentEventThrows() {
        UUID nonExistentEventId = UUID.randomUUID();
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.getAnnouncementsByEventId(nonExistentEventId, 0, 20, organizerId, false));
        assertTrue(exception.getMessage().contains("Event not found"));
    }

    @Test
    @Transactional
    void getAnnouncementsByEventIdAsAdminReturnsDraftsAndPublished() {
        createAnnouncement("Draft 1");
        Announcement publishedAnn = createAnnouncement("Published 1");
        publishedAnn.status = AnnouncementStatus.PUBLISHED;
        announcementRepository.persist(publishedAnn);

        PanacheQuery<Announcement> query = announcementService.getAnnouncementsByEventId(eventId, null, null, null,
                true);
        assertEquals(2, query.list().size());
    }

    @Test
    @Transactional
    void getAnnouncementsByEventIdAsOrganizerReturnsDraftsAndPublished() {
        createAnnouncement("Draft 1");
        Announcement publishedAnn = createAnnouncement("Published 1");
        publishedAnn.status = AnnouncementStatus.PUBLISHED;
        announcementRepository.persist(publishedAnn);

        PanacheQuery<Announcement> query = announcementService.getAnnouncementsByEventId(eventId, 0, 10, organizerId,
                false);
        assertEquals(2, query.list().size());
    }

    @Test
    @Transactional
    void getAnnouncementsByEventIdAsRegularUserReturnsOnlyPublished() {
        createAnnouncement("Draft 1");
        Announcement publishedAnn = createAnnouncement("Published 1");
        publishedAnn.status = AnnouncementStatus.PUBLISHED;
        announcementRepository.persist(publishedAnn);

        PanacheQuery<Announcement> query = announcementService.getAnnouncementsByEventId(eventId, 0, 10,
                otherOrganizerId, false);
        List<Announcement> list = query.list();
        assertEquals(1, list.size());
        assertEquals(AnnouncementStatus.PUBLISHED, list.get(0).status);
    }

    @Test
    @Transactional
    void getAnnouncementsByEventIdWithPagination() {
        for (int i = 0; i < 25; i++) {
            Announcement ann = createAnnouncement("Announcement " + i);
            ann.status = AnnouncementStatus.PUBLISHED;
            announcementRepository.persist(ann);
        }

        PanacheQuery<Announcement> query = announcementService.getAnnouncementsByEventId(eventId, 2, 10, organizerId,
                false);
        assertEquals(5, query.list().size());
    }

    @Test
    @Transactional
    void getAnnouncementsByEventIdDoesNotIncludeOtherEvents() {
        Event otherEvent = createTestEvent(organizerId, EventStatus.PUBLISHED, "Other Event");

        createAnnouncement("Event 1 Announcement");
        createAnnouncementForEvent(otherEvent.eventId, "Event 2 Announcement");

        PanacheQuery<Announcement> query = announcementService.getAnnouncementsByEventId(eventId, 0, 20, organizerId,
                false);
        assertEquals(1, query.list().size());
    }

    // ********** GET Single Announcement by ID **********

    @Test
    @Transactional
    void getAnnouncementByIdWithNullIdsThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> announcementService.getAnnouncementById(null, UUID.randomUUID(), organizerId, false));
        assertThrows(IllegalArgumentException.class,
                () -> announcementService.getAnnouncementById(eventId, null, organizerId, false));
    }

    @Test
    @Transactional
    void getAnnouncementByIdForNonExistentEventThrows() {
        UUID nonExistentEventId = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> announcementService.getAnnouncementById(nonExistentEventId,
                UUID.randomUUID(), organizerId, false));
    }

    @Test
    @Transactional
    void getAnnouncementByIdForNonExistentAnnouncementThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> announcementService.getAnnouncementById(eventId, UUID.randomUUID(), organizerId, false));
    }

    @Test
    @Transactional
    void getAnnouncementByIdFromDifferentEventThrows() {
        Event otherEvent = createTestEvent(organizerId, EventStatus.PUBLISHED, "Other Event");

        Announcement announcementInOtherEvent = createAnnouncementForEvent(otherEvent.eventId, "Other announcement");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.getAnnouncementById(eventId, announcementInOtherEvent.announcementId,
                        organizerId, false));
        assertTrue(exception.getMessage().contains("does not belong to the specified event"));
    }

    @Test
    @Transactional
    void getAnnouncementByIdDraftAsRegularUserThrowsNotFound() {
        Announcement draft = createAnnouncement("Secret draft");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.getAnnouncementById(eventId, draft.announcementId, otherOrganizerId, false));
        assertTrue(exception.getMessage().contains("Announcement not found"));
    }

    @Test
    @Transactional
    void getAnnouncementByIdDraftAsOrganizerOrAdminSucceeds() {
        Announcement draft = createAnnouncement("Secret draft");

        assertNotNull(announcementService.getAnnouncementById(eventId, draft.announcementId, organizerId, false));
        assertNotNull(announcementService.getAnnouncementById(eventId, draft.announcementId, null, true));
    }

    // ********** DELETE Announcement **********

    @Test
    @Transactional
    void deleteAnnouncementWithNullFieldsThrows() {
        UUID validId = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class,
                () -> announcementService.deleteAnnouncement(null, validId, validId, false));
        assertThrows(IllegalArgumentException.class,
                () -> announcementService.deleteAnnouncement(validId, null, validId, false));
        assertThrows(IllegalArgumentException.class,
                () -> announcementService.deleteAnnouncement(validId, validId, null, false));
    }

    @Test
    @Transactional
    void deleteAnnouncementForNonExistentEventThrows() {
        UUID nonExistentEventId = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> announcementService.deleteAnnouncement(nonExistentEventId,
                UUID.randomUUID(), organizerId, false));
    }

    @Test
    @Transactional
    void deleteAnnouncementByNonOrganizerThrows() {
        Announcement announcement = createAnnouncement("To be deleted");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.deleteAnnouncement(eventId, announcement.announcementId, otherOrganizerId,
                        false));
        assertEquals("Only the event organizer can delete announcements", exception.getMessage());
    }

    @Test
    @Transactional
    void deleteAnnouncementForNonExistentAnnouncementThrows() {
        UUID nonExistentAnnouncementId = UUID.randomUUID();
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.deleteAnnouncement(eventId, nonExistentAnnouncementId, organizerId, false));
        assertTrue(exception.getMessage().contains("Announcement not found"));
    }

    @Test
    @Transactional
    void deleteAnnouncementFromDifferentEventThrows() {
        Event otherEvent = createTestEvent(organizerId, EventStatus.PUBLISHED, "Other Event");

        Announcement announcementInOtherEvent = createAnnouncementForEvent(otherEvent.eventId, "Other announcement");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> announcementService.deleteAnnouncement(eventId, announcementInOtherEvent.announcementId,
                        organizerId, false));
        assertTrue(exception.getMessage().contains("does not belong to the specified event"));
    }

    @Test
    @Transactional
    void deleteAnnouncementSuccessfully() {
        Announcement announcement = createAnnouncement("Delete Me");
        UUID id = announcement.announcementId;

        announcementService.deleteAnnouncement(eventId, id, organizerId, false);
        assertTrue(announcementRepository.findByIdOptional(id).isEmpty());
    }

    @Test
    @Transactional
    void deleteAnnouncementAsAdminSucceeds() {
        Announcement announcement = createAnnouncement("Delete as admin");
        UUID id = announcement.announcementId;

        assertDoesNotThrow(() -> announcementService.deleteAnnouncement(eventId, id, UUID.randomUUID(), true));

        assertTrue(announcementRepository.findByIdOptional(id).isEmpty());
    }

    // ********** Private Helper Testing Methods **********

    private Announcement createAnnouncement(String body) {
        return createAnnouncementForEvent(eventId, body);
    }

    private Announcement createAnnouncementForEvent(UUID targetEventId, String body) {
        Announcement request = new Announcement();
        request.eventId = targetEventId;
        request.organizerId = organizerId;
        request.body = body;
        return announcementService.createAnnouncement(request);
    }
}