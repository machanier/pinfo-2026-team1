package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
import ch.unige.pinfo.event.repository.EventRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class AnnouncementService {

    @Inject
    AnnouncementRepository announcementRepository;

    @Inject
    EventRepository eventRepository;

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

        announcementRepository.persist(announcement);
        return announcement;
    }

}
