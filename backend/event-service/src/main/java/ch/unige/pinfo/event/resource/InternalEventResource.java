package ch.unige.pinfo.event.resource;

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
 * declarative config ({@code kong/kong.yml}), so they are never reachable from
 * the public internet. A second line of defence is provided by
 * {@link InternalSecurityFilter}: every request to {@code /internal/**} must
 * carry a valid {@code X-Internal-Service-Key} header.
 *
 * Clients: Registration Service (before accepting a registration).
 */
@Path("/internal/events/{eventId}")
@Produces(MediaType.APPLICATION_JSON)
@PermitAll
public class InternalEventResource implements InternalApi {

    @Inject
    EventService eventService;

    /**
     * Returns full event detail including eligibility rules and current capacity.
     * Called by the Registration Service before accepting a registration.
     */
    @Override
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
    @Override
    @GET
    @Path("/capacity")
    public CapacityInfo internalEventsEventIdCapacityGet(@PathParam("eventId") UUID eventId) {
        try {
            return eventService.getCapacityInfo(eventId);
        } catch (IllegalArgumentException e) {
            throw new NotFoundException("Event not found: " + eventId);
        }
    }

    // Mapping

    private EventResponse mapToEventResponse(Event event) {
        EventResponse response = new EventResponse();
        response.setEventId(event.eventId);
        response.setTitle(event.title);
        response.setDescription(event.description);
        response.setPlace(event.place);
        response.setTime(event.time);
        response.setEndTime(event.endTime);
        response.setOrganizerId(event.organizerId);
        response.setCapacity(event.capacity);
        response.setRegisteredCount(0); // TODO: implement registration count
        response.setStatus(event.status);
        if (event.restrictedTo != null) {
            response.setRestrictedTo(convertEligibilityRule(event.restrictedTo));
        }
        response.setTags(event.tags);
        response.setCategory(event.category);
        response.setCreatedAt(event.createdAt);
        response.setUpdatedAt(event.updatedAt);
        return response;
    }

    private ch.unige.pinfo.event.openapi.model.EligibilityRule convertEligibilityRule(
            ch.unige.pinfo.event.model.EligibilityRule entityRule) {
        if (entityRule == null)
            return null;
        ch.unige.pinfo.event.openapi.model.EligibilityRule apiRule = new ch.unige.pinfo.event.openapi.model.EligibilityRule();
        apiRule.setFaculties(entityRule.faculties);
        apiRule.setMajors(entityRule.majors);
        if (entityRule.degreeLevels != null) {
            apiRule.setDegreeLevels(entityRule.degreeLevels.stream()
                    .map(ch.unige.pinfo.event.openapi.model.EligibilityRule.DegreeLevelsEnum::fromValue)
                    .toList());
        }
        return apiRule;
    }
}
