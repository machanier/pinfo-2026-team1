package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.event.mapper.EventMapper;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.api.InternalApi;
import ch.unige.pinfo.event.openapi.model.CapacityInfo;
import ch.unige.pinfo.event.openapi.model.EventResponse;
import ch.unige.pinfo.event.service.EventService;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.UUID;

/**
 * Service-to-service internal endpoints for the event-service.
 *
 * These paths are intentionally not registered in Kong's
 * declarative config, so they are never reachable from
 * the public internet. A second line of defence is provided by
 * {@link InternalSecurityFilter}: every request to /internal/** must
 * carry a valid X-Internal-Service-Key header.
 *
 * Clients: Registration Service (before accepting a registration).
 */
@Path("/internal/events/{eventId}")
@Produces(MediaType.APPLICATION_JSON)
@PermitAll
public class InternalEventResource {

    @Inject
    EventService eventService;

    @Inject
    EventMapper eventMapper;

    /**
     * Returns full event detail including eligibility rules and current capacity.
     * Called by the Registration Service before accepting a registration.
     */
    @GET
    public EventResponse internalEventsEventIdGet(@PathParam("eventId") UUID eventId) {
        Event event = eventService.getEventById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
        return mapToEventResponse(event);
    }

    /**
     * Returns the current capacity state: total capacity, registered count,
     * available slots, and whether the event is full.
     */
    @GET
    @Path("/capacity")
    public CapacityInfo internalEventsEventIdCapacityGet(@PathParam("eventId") UUID eventId) {
        try {
            return eventService.getCapacityInfo(eventId);
        } catch (IllegalArgumentException e) {
            throw new NotFoundException("Event not found: " + eventId);
        }
    }

    private EventResponse mapToEventResponse(Event event) {
        return eventMapper.toEventResponse(event, 0);
    }

}
