package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.service.EventService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.UUID;

@Path("/api/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EventResource {

    @Inject
    EventService eventService;

    /**
     * Publish a DRAFT event (DRAFT → PUBLISHED)
     * 
     * @param eventId the event to publish
     * @return 200 with updated event, 404 if not found, 409 on illegal state
     *         transition
     */
    @PATCH
    @Path("/{eventId}/publish")
    public Response publishEvent(@PathParam("eventId") UUID eventId) {
        try {
            Event event = eventService.publishEvent(eventId);
            return Response.ok(event).build();
        } catch (IllegalArgumentException e) {
            // Event not found
            return Response.status(Response.Status.NOT_FOUND).build();
        } catch (IllegalStateException e) {
            // Invalid state transition (e.g., trying to publish an already published event)
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErrorResponse(409, "Conflict", e.getMessage()))
                    .build();
        }
    }

    /**
     * Cancel a PUBLISHED event (PUBLISHED → CANCELLED)
     * 
     * @param eventId the event to cancel
     * @return 200 with updated event, 404 if not found, 409 on illegal state
     *         transition
     */
    @PATCH
    @Path("/{eventId}/cancel")
    public Response cancelEvent(@PathParam("eventId") UUID eventId) {
        try {
            Event event = eventService.cancelEvent(eventId);
            return Response.ok(event).build();
        } catch (IllegalArgumentException e) {
            // Event not found
            return Response.status(Response.Status.NOT_FOUND).build();
        } catch (IllegalStateException e) {
            // Invalid state transition (e.g., trying to cancel a draft event)
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErrorResponse(409, "Conflict", e.getMessage()))
                    .build();
        }
    }

    // Simple error response class
    public static class ErrorResponse {
        public int status;
        public String error;
        public String message;

        public ErrorResponse(int status, String error, String message) {
            this.status = status;
            this.error = error;
            this.message = message;
        }
    }
}
