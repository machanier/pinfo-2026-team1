package ch.unige.pinfo.event.resource;

import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ch.unige.pinfo.event.service.EventInternalService;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.dto.CapacityInfoDTO;
import ch.unige.pinfo.event.dto.EligibilityRuleDTO;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.UUID;

@Path("/internal/events")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@PermitAll
public class EventInternalResource {

    @Inject
    EventInternalService eventInternalService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GET
    @Path("/{eventId}")
    public Response getEvent(@PathParam("eventId") UUID eventId) {
        System.out.println("=== EventInternalResource ===");
        System.out.println("GET /internal/events/" + eventId);

        Event event = eventInternalService.getEventById(eventId);

        if (event == null) {
            System.out.println("Event not found: " + eventId);
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\": \"Event not found\"}")
                    .build();
        }

        System.out.println("Event found: " + event.getTitle());
        System.out.println("Status: " + event.getStatus());
        System.out.println("RestrictedTo: " + event.getRestrictedToJson());

        try {
            // Build response similar to OpenAPI EventResponse
            var response = objectMapper.createObjectNode();
            response.put("eventId", event.getEventId().toString());
            response.put("title", event.getTitle());
            response.put("description", event.getDescription());
            response.put("place", event.getPlace());
            response.put("time", event.getTime().toString());
            if (event.getEndTime() != null) {
                response.put("endTime", event.getEndTime().toString());
            }
            response.put("organizerId", event.getOrganizerId().toString());
            response.put("organizerName", event.getOrganizerName());
            response.put("capacity", event.getCapacity());
            response.put("registeredCount", event.getRegisteredCount());
            response.put("status", event.getStatus().toString());
            response.put("category", event.getCategory());

            // Parse and include restrictedTo if present
            EligibilityRuleDTO rule = eventInternalService.parseRestrictedTo(event);
            if (rule != null) {
                response.putPOJO("restrictedTo", rule);
            }

            response.put("createdAt", event.getCreatedAt().toString());
            response.put("updatedAt", event.getUpdatedAt().toString());

            return Response.ok(response).build();
        } catch (Exception e) {
            System.err.println("Error building response: " + e.getMessage());
            return Response.serverError().entity("{\"error\": \"" + e.getMessage() + "\"}").build();
        }
    }

    @GET
    @Path("/{eventId}/capacity")
    public Response getCapacity(@PathParam("eventId") UUID eventId) {
        System.out.println("=== EventInternalResource ===");
        System.out.println("GET /internal/events/" + eventId + "/capacity");

        CapacityInfoDTO capacity = eventInternalService.getCapacity(eventId);

        if (capacity == null) {
            System.out.println("Event not found: " + eventId);
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\": \"Event not found\"}")
                    .build();
        }

        System.out.println("Capacity info:");
        System.out.println("  total: " + capacity.getCapacity());
        System.out.println("  registered: " + capacity.getRegisteredCount());
        System.out.println("  availableSlots: " + capacity.getAvailableSlots());
        System.out.println("  isFull: " + capacity.getIsFull());

        return Response.ok(capacity).build();
    }
}