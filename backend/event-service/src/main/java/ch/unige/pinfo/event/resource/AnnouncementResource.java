package ch.unige.pinfo.event.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;
import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.openapi.api.AnnouncementsApi;
import ch.unige.pinfo.event.openapi.model.AnnouncementPage;
import ch.unige.pinfo.event.openapi.model.AnnouncementResponse;
import ch.unige.pinfo.event.openapi.model.CreateAnnouncementRequest;
import ch.unige.pinfo.event.service.AnnouncementService;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import org.jboss.resteasy.reactive.ResponseStatus;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AnnouncementResource implements AnnouncementsApi {

    @Inject
    AnnouncementService announcementService;

    @Inject
    ch.unige.pinfo.event.messaging.AnnouncementChangePublisher announcementPublisher;

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
            // Publish to Kafka AFTER the @Transactional boundary has committed.
            // Keeping this call inside createAnnouncement() (which is @Transactional)
            // activates SmallRye's transactional outbox: the send is deferred to commit
            // time, and a Kafka failure rolls back the DB write → HTTP 500. Calling it
            // here ensures the DB write is durably committed before we attempt messaging.
            announcementPublisher.announcementSubmitted(created);
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
        } catch (Exception e) {
            // Catches RollbackException / PersistenceException from @Transactional
            // commit failures (e.g. missing table, constraint violation) that are not
            // IllegalArgumentExceptions and would otherwise silently become HTTP 500.
            throw new InternalServerErrorException("Failed to create announcement", e);
        }
    }

    @Override
    @DELETE
    @Path("/{announcementId}")
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @ResponseStatus(204)
    public void apiEventsEventIdAnnouncementsAnnouncementIdDelete(
            @PathParam("eventId") UUID eventId,
            @PathParam("announcementId") UUID announcementId) {
        // Get organizer ID from authenticated user
        UUID organizerId = getOrganizerIdFromJwt();

        try {
            announcementService.deleteAnnouncement(eventId, announcementId, organizerId, isAdmin());
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            if (message != null
                    && (message.startsWith("Event not found:") || message.startsWith("Announcement not found:")
                            || message.contains("does not belong to the specified event"))) {
                throw new NotFoundException(message);
            }
            if (message != null && message.equals("Only the event organizer can delete announcements")) {
                throw new ForbiddenException(message);
            }
            throw new BadRequestException(message);
        }
    }

    @Override
    @GET
    @Path("/{announcementId}")
    @PermitAll
    @Produces(MediaType.APPLICATION_JSON)
    public AnnouncementResponse apiEventsEventIdAnnouncementsAnnouncementIdGet(
            @PathParam("eventId") UUID eventId,
            @PathParam("announcementId") UUID announcementId) {
        try {
            UUID requesterId = tryGetOrganizerIdFromJwt();
            boolean isAdmin = isAdmin();
            Announcement announcement = announcementService.getAnnouncementById(eventId, announcementId, requesterId,
                    isAdmin);
            return mapToAnnouncementResponse(announcement);
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            if (message != null
                    && (message.startsWith("Event not found:") || message.startsWith("Announcement not found:"))) {
                throw new NotFoundException(message);
            }
            if (message != null && message.contains("does not belong to the specified event")) {
                throw new NotFoundException(message);
            }
            throw new BadRequestException(message);
        }
    }

    @Override
    @GET
    @PermitAll
    @Produces(MediaType.APPLICATION_JSON)
    public AnnouncementPage apiEventsEventIdAnnouncementsGet(
            @PathParam("eventId") UUID eventId,
            @QueryParam("page") @DefaultValue("0") Integer page,
            @QueryParam("size") @DefaultValue("20") Integer size) {
        try {
            if (eventId == null) {
                throw new BadRequestException("Event ID is required");
            }

            UUID requesterId = tryGetOrganizerIdFromJwt();
            boolean isAdmin = isAdmin();
            PanacheQuery<Announcement> query = announcementService.getAnnouncementsByEventId(eventId, page, size,
                    requesterId, isAdmin);

            long totalElements = query.count();
            List<Announcement> announcements = query.list();

            // Build AnnouncementPage response
            AnnouncementPage announcementPage = new AnnouncementPage();
            announcementPage.setContent(announcements.stream()
                    .map(this::mapToAnnouncementResponse)
                    .toList());
            announcementPage.setPage(page != null ? page : 0);
            announcementPage.setSize(size != null ? size : 20);
            announcementPage.setTotalElements((int) totalElements);
            announcementPage.setTotalPages((int) Math.ceil((double) totalElements / (size != null ? size : 20)));

            return announcementPage;
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            if (message != null && message.startsWith("Event not found:")) {
                throw new NotFoundException(message);
            }
            throw new BadRequestException(message);
        }
    }

    private AnnouncementResponse mapToAnnouncementResponse(Announcement announcement) {
        AnnouncementResponse response = new AnnouncementResponse();
        response.setAnnouncementId(announcement.announcementId);
        response.setEventId(announcement.eventId);
        response.setOrganizerId(announcement.organizerId);
        response.setBody(announcement.body);
        response.setPostedAt(announcement.postedAt);
        response.setStatus(announcement.status);
        return response;
    }

    /**
     * Extract organizer ID from JWT subject.
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

    /*
     * tryGetOrganizerIdFromJwt() is used instead of the strict JWT method so
     * unauthenticated
     * callers can still read public announcements without a 401.
     */
    private UUID tryGetOrganizerIdFromJwt() {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(subject.getBytes(StandardCharsets.UTF_8));
        }
    }

    private boolean isAdmin() {
        return jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");
    }
}