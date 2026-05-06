package ch.unige.pinfo.event.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;
import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.openapi.api.AnnouncementsApi;
import ch.unige.pinfo.event.openapi.model.AnnouncementResponse;
import ch.unige.pinfo.event.openapi.model.CreateAnnouncementRequest;
import ch.unige.pinfo.event.service.AnnouncementService;
import org.jboss.resteasy.reactive.ResponseStatus;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@ApplicationScoped
public class AnnouncementResource implements AnnouncementsApi {

    @Inject
    AnnouncementService announcementService;

    @Inject
    JsonWebToken jwt;

    @Override
    @POST
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    public AnnouncementResponse apiEventsEventIdAnnouncementsPost(
            @PathParam("eventId") UUID eventId,
            CreateAnnouncementRequest createAnnouncementRequest) {
        // Get organizer ID from authenticated user
        UUID organizerId = getOrganizerIdFromJwt();

        Announcement announcement = new Announcement();
        announcement.eventId = eventId;
        announcement.organizerId = organizerId;
        announcement.body = createAnnouncementRequest.getBody();

        try {
            Announcement created = announcementService.createAnnouncement(announcement);
            return mapToAnnouncementResponse(created);
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            if (message != null && message.startsWith("Event not found:")) {
                throw new NotFoundException(message);
            }
            if (message != null && message.equals("Only the event organizer can post announcements")) {
                throw new ForbiddenException(message);
            }
            throw new BadRequestException(message);
        }
    }

    @Override
    public void apiEventsEventIdAnnouncementsAnnouncementIdDelete(UUID eventId, UUID announcementId) {
        throw new WebApplicationException("Endpoint not implemented yet", 501);
    }

    @Override
    public AnnouncementResponse apiEventsEventIdAnnouncementsAnnouncementIdGet(UUID eventId, UUID announcementId) {
        throw new WebApplicationException("Endpoint not implemented yet", 501);
    }

    @Override
    public ch.unige.pinfo.event.openapi.model.AnnouncementPage apiEventsEventIdAnnouncementsGet(UUID eventId,
            Integer page,
            Integer size) {
        throw new WebApplicationException("Endpoint not implemented yet", 501);
    }

    private AnnouncementResponse mapToAnnouncementResponse(Announcement announcement) {
        AnnouncementResponse response = new AnnouncementResponse();
        response.setAnnouncementId(announcement.announcementId);
        response.setEventId(announcement.eventId);
        response.setOrganizerId(announcement.organizerId);
        response.setBody(announcement.body);
        response.setPostedAt(announcement.postedAt);
        return response;
    }

    /**
     * Extract organizer ID from JWT subject.
     * Handles both UUID (production) and Auth0 ID (test) formats.
     */
    private UUID getOrganizerIdFromJwt() {
        String subject = jwt.getSubject();

        if (subject == null || subject.isBlank()) {
            throw new NotAuthorizedException(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("JWT subject claim is missing or invalid")
                            .build());
        }

        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(subject.getBytes(StandardCharsets.UTF_8));
        }
    }
}
