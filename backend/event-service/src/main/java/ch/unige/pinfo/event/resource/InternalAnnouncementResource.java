package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.openapi.model.AnnouncementResponse;
import ch.unige.pinfo.event.service.AnnouncementService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@Path("/internal/announcements")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class InternalAnnouncementResource {

    @Inject
    AnnouncementService announcementService;

    @ConfigProperty(name = "internal.service.key", defaultValue = "")
    String expectedServiceKey;

    @PATCH
    @Path("/{announcementId}/publish")
    public AnnouncementResponse publishAnnouncement(
            @PathParam("announcementId") UUID announcementId,
            @HeaderParam("X-Internal-Service-Key") String internalServiceKey) {
        verifyInternalKey(internalServiceKey);

        try {
            Announcement announcement = announcementService.publishAnnouncement(announcementId);
            return mapToAnnouncementResponse(announcement);
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            if (message != null
                    && (message.startsWith("Announcement not found:") || message.startsWith("Event not found:"))) {
                throw new NotFoundException(message);
            }
            throw new WebApplicationException(message, 400);
        } catch (IllegalStateException e) {
            throw new WebApplicationException(e.getMessage(), 409);
        }
    }

    private void verifyInternalKey(String internalServiceKey) {
        if (expectedServiceKey == null || expectedServiceKey.isBlank()) {
            return;
        }

        if (internalServiceKey == null || !expectedServiceKey.equals(internalServiceKey)) {
            throw new NotAuthorizedException(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("Missing or invalid internal service key")
                            .build());
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
}
