package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.AnnouncementStatus;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;

@ApplicationScoped
public class AnnouncementService {

    @Inject
    AnnouncementRepository announcementRepository;

    @Inject
    EventRepository eventRepository;

    @Inject
    ch.unige.pinfo.event.messaging.AnnouncementChangePublisher announcementPublisher;

    @Transactional
    public Announcement createAnnouncement(Announcement request) {
        if (request == null) {
            throw new IllegalArgumentException("Announcement payload is required");
        }
        if (request.eventId == null) {
            throw new IllegalArgumentException("Event ID is required");
        }
        if (request.organizerId == null) {
            throw new IllegalArgumentException("Organizer ID is required");
        }
        if (request.body == null || request.body.isBlank()) {
            throw new IllegalArgumentException("Announcement body is required");
        }
        if (request.body.length() > 2000) {
            throw new IllegalArgumentException("Announcement body must not exceed 2000 characters");
        }

        Event event = eventRepository.findByIdOptional(request.eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + request.eventId));

        if (!event.organizerId.equals(request.organizerId)) {
            throw new IllegalArgumentException("Only the event organizer can post announcements");
        }

        Announcement announcement = new Announcement();
        announcement.eventId = request.eventId;
        announcement.organizerId = request.organizerId;
        announcement.body = request.body.trim();
        announcement.status = AnnouncementStatus.PENDING_MODERATION;
        // postedAt is set by @PrePersist to the submission time (NOT NULL constraint).
        // publishAnnouncement() overwrites it with the actual publication timestamp.

        announcementRepository.persist(announcement);
        // NOTE: Kafka publish (announcement.submitted) is intentionally NOT called here.
        // Calling the Kafka emitter inside a @Transactional method activates SmallRye's
        // transactional outbox behaviour: the send is deferred to commit time. When Kafka
        // is unavailable (dev without fullstack profile, or a transient broker failure),
        // the commit fails and the whole DB write rolls back, causing HTTP 500.
        // The caller (AnnouncementResource) is responsible for publishing after the
        // transaction has committed successfully.
        return announcement;
    }

    @Transactional
    public Announcement publishAnnouncement(UUID announcementId) {
        if (announcementId == null) {
            throw new IllegalArgumentException("Announcement ID is required");
        }

        Announcement announcement = announcementRepository.findByIdOptional(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found: " + announcementId));

        if (announcement.status != AnnouncementStatus.PENDING_MODERATION) {
            throw new IllegalStateException("Announcement is not in PENDING_MODERATION status");
        }

        eventRepository.findByIdOptional(announcement.eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + announcement.eventId));

        announcement.status = AnnouncementStatus.PUBLISHED;
        announcement.postedAt = OffsetDateTime.now();
        announcementRepository.persist(announcement);

        // Publish Kafka announcement.posted for downstream consumers (notifications)
        announcementPublisher.announcementPosted(announcement);
        return announcement;
    }

    /**
     * Applies a moderation decision consumed from Kafka.
        * APPROVED publishes the announcement, REJECTED marks it as REJECTED.
     */
    @Transactional
    public Announcement applyModerationDecision(UUID announcementId, String moderationStatus) {
        if (announcementId == null) {
            throw new IllegalArgumentException("Announcement ID is required");
        }

        Announcement announcement = announcementRepository.findByIdOptional(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found: " + announcementId));

        if ("APPROVED".equalsIgnoreCase(moderationStatus)) {
            return publishAnnouncement(announcementId);
        }

        if ("REJECTED".equalsIgnoreCase(moderationStatus)) {
            announcement.status = AnnouncementStatus.REJECTED;
            // postedAt is NOT NULL in the DB — keep the submission timestamp on rejection.
            announcementRepository.persist(announcement);
            return announcement;
        }

        throw new IllegalArgumentException("Unsupported moderation status: " + moderationStatus);
    }

    /**
     * Get announcements for a specific event with pagination.
     * Validates that the event exists.
     *
     * @param eventId
     * @param page    the page number
     * @param size    the page size
     * @return paginated query of announcements for the event ordered by most recent
     *         first
     * @throws IllegalArgumentException if event does not exist
     */
    public PanacheQuery<Announcement> getAnnouncementsByEventId(UUID eventId, Integer page, Integer size,
            UUID requesterId, boolean isAdmin) {
        if (eventId == null) {
            throw new IllegalArgumentException("Event ID is required");
        }

        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        boolean canViewAll = isAdmin || (requesterId != null && event.organizerId.equals(requesterId));

        // Return paginated announcements ordered by most recent first
        String query = canViewAll
                ? "eventId = ?1 ORDER BY postedAt DESC"
                : "eventId = ?1 and status = ?2 ORDER BY postedAt DESC";

        PanacheQuery<Announcement> result = canViewAll
                ? announcementRepository.find(query, eventId)
                : announcementRepository.find(query, eventId, AnnouncementStatus.PUBLISHED);

        return result
                .page(page != null ? page : 0, size != null ? size : 20);
    }

    /**
     * Get a single announcement by ID.
     * Validates that both the event and announcement exist, and that the
     * announcement
     * belongs to the specified event.
     * 
     *
     * @param eventId
     * @param announc
     * @return the announcement if found
     * @throws IllegalArgumentException if event or announcement not found, or
     *                                  announcement does not belong to event
     */
    public Announcement getAnnouncementById(UUID eventId, UUID announcementId, UUID requesterId, boolean isAdmin) {
        if (eventId == null) {
            throw new IllegalArgumentException("Event ID is required");
        }
        if (announcementId == null) {
            throw new IllegalArgumentException("Announcement ID is required");
        }

        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        // Find announcement and verify it belongs to the event
        Announcement announcement = announcementRepository.findByIdOptional(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found: " + announcementId));

        if (!announcement.eventId.equals(eventId)) {
            throw new IllegalArgumentException("Announcement does not belong to the specified event");
        }

        boolean canViewAll = isAdmin || (requesterId != null && event.organizerId.equals(requesterId));
        if (!canViewAll && announcement.status != AnnouncementStatus.PUBLISHED) {
            throw new IllegalArgumentException("Announcement not found: " + announcementId);
        }

        return announcement;
    }

    /**
     * Delete an announcement.
     *
     * @param eventId
     * @param announcementId
     * @param organizerId    the ID of the user attempting to delete
     * @throws IllegalArgumentException if event or announcement not found, or
     *                                  announcement does not belong to event
     * @throws IllegalArgumentException if organizer is not the event owner
     */
    @Transactional
    public void deleteAnnouncement(UUID eventId, UUID announcementId, UUID organizerId, boolean isAdmin) {
        if (eventId == null) {
            throw new IllegalArgumentException("Event ID is required");
        }
        if (announcementId == null) {
            throw new IllegalArgumentException("Announcement ID is required");
        }
        if (organizerId == null) {
            throw new IllegalArgumentException("Organizer ID is required");
        }

        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        if (!isAdmin && !event.organizerId.equals(organizerId)) {
            throw new IllegalArgumentException("Only the event organizer can delete announcements");
        }

        Announcement announcement = announcementRepository.findByIdOptional(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found: " + announcementId));

        if (!announcement.eventId.equals(eventId)) {
            throw new IllegalArgumentException("Announcement does not belong to the specified event");
        }

        announcementRepository.delete(announcement);
    }

}
