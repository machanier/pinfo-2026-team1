package ch.unige.pinfo.event.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;
import ch.unige.pinfo.event.openapi.api.EventsApi;
import ch.unige.pinfo.event.openapi.model.ApiEventsEventIdCancelPatchRequest;
import ch.unige.pinfo.event.openapi.model.CreateEventRequest;
import ch.unige.pinfo.event.openapi.model.EventPage;
import ch.unige.pinfo.event.openapi.model.EventResponse;
import ch.unige.pinfo.event.openapi.model.UpdateEventRequest;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.service.EventService;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import org.jboss.resteasy.reactive.ResponseStatus;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.UUID;
import java.util.List;

@Path("/api/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EventResource implements EventsApi {

    @Inject
    EventService eventService;

    @Inject
    JsonWebToken jwt;

    @Override
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public EventPage apiEventsGet(
            @QueryParam("organizerId") UUID organizerId,
            @QueryParam("status") EventStatus status,
            @QueryParam("page") @DefaultValue("0") Integer page,
            @QueryParam("size") @DefaultValue("20") Integer size) {

        PanacheQuery<Event> query = eventService.getEvents(organizerId, status);

        long totalElements = query.count();
        List<Event> events = query.page(page, size).list();

        // Build EventPage response
        EventPage eventPage = new EventPage();
        eventPage.setContent(events.stream()
                .map(this::mapToEventResponse)
                .toList());
        eventPage.setPage(page);
        eventPage.setSize(size);
        eventPage.setTotalElements((int) totalElements);
        eventPage.setTotalPages((int) Math.ceil((double) totalElements / size));

        return eventPage;
    }

    @Override
    @POST
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    public EventResponse apiEventsPost(CreateEventRequest createEventRequest) {
        // Get organizer ID from authenticated user
        UUID organizerId = getOrganizerIdFromJwt();

        Event event = new Event();
        event.organizerId = organizerId;
        event.title = createEventRequest.getTitle();
        event.description = createEventRequest.getDescription();
        event.place = createEventRequest.getPlace();
        event.time = createEventRequest.getTime();
        event.endTime = createEventRequest.getEndTime();
        event.capacity = createEventRequest.getCapacity();
        event.category = createEventRequest.getCategory();
        event.tags = createEventRequest.getTags();
        // Convert OpenAPI EligibilityRule to entity EligibilityRule if needed
        if (createEventRequest.getRestrictedTo() != null) {
            event.restrictedTo = convertEligibilityRule(createEventRequest.getRestrictedTo());
        }

        Event created = eventService.createEvent(event);
        return mapToEventResponse(created);
    }

    @Override
    @PATCH
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Path("/{eventId}/publish")
    public EventResponse apiEventsEventIdPublishPatch(@PathParam("eventId") UUID eventId) {
        try {
            Event event = eventService.getEventById(eventId)
                    .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
            allowOnlyOwnerOrAdmin(event);

            Event publishedEvent = eventService.publishEvent(eventId);
            return mapToEventResponse(publishedEvent);
        } catch (IllegalArgumentException e) {
            throw new NotFoundException("Event not found: " + eventId);
        } catch (IllegalStateException e) {
            throw new WebApplicationException(e.getMessage(), 409);
        }
    }

    @Override
    @PATCH
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Path("/{eventId}/cancel")
    public EventResponse apiEventsEventIdCancelPatch(
            @PathParam("eventId") UUID eventId,
            ApiEventsEventIdCancelPatchRequest request) {
        try {
            Event event = eventService.getEventById(eventId)
                    .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
            allowOnlyOwnerOrAdmin(event);

            Event cancelledEvent = eventService.cancelEvent(eventId);
            return mapToEventResponse(cancelledEvent);
        } catch (IllegalArgumentException e) {
            throw new NotFoundException("Event not found: " + eventId);
        } catch (IllegalStateException e) {
            throw new WebApplicationException(e.getMessage(), 409);
        }
    }

    @Override
    @GET
    @Path("/{eventId}")
    public EventResponse apiEventsEventIdGet(@PathParam("eventId") UUID eventId) {
        Event event = eventService.getEventById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
        return mapToEventResponse(event);
    }

    @Override
    @PUT
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Path("/{eventId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public EventResponse apiEventsEventIdPut(
            @PathParam("eventId") UUID eventId,
            UpdateEventRequest updateRequest) {
        Event event = eventService.getEventById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
        allowOnlyOwnerOrAdmin(event);

        // Convert OpenAPI update request to entity-compatible format
        Event updateData = new Event();
        if (updateRequest.getTitle() != null)
            updateData.title = updateRequest.getTitle();
        if (updateRequest.getDescription() != null)
            updateData.description = updateRequest.getDescription();
        if (updateRequest.getPlace() != null)
            updateData.place = updateRequest.getPlace();
        if (updateRequest.getTime() != null)
            updateData.time = updateRequest.getTime();
        if (updateRequest.getEndTime() != null)
            updateData.endTime = updateRequest.getEndTime();
        if (updateRequest.getCapacity() != null)
            updateData.capacity = updateRequest.getCapacity();
        if (updateRequest.getCategory() != null)
            updateData.category = updateRequest.getCategory();
        if (updateRequest.getTags() != null)
            updateData.tags = updateRequest.getTags();
        if (updateRequest.getRestrictedTo() != null)
            updateData.restrictedTo = convertEligibilityRule(updateRequest.getRestrictedTo());

        Event updatedEvent = eventService.updateEvent(eventId, updateData);
        return mapToEventResponse(updatedEvent);
    }

    @Override
    @DELETE
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Path("/{eventId}")
    public void apiEventsEventIdDelete(@PathParam("eventId") UUID eventId) {
        Event event = eventService.getEventById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
        allowOnlyOwnerOrAdmin(event);

        try {
            eventService.deleteEvent(eventId);
        } catch (IllegalStateException e) {
            throw new WebApplicationException(e.getMessage(), 409);
        }
    }

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

    private void allowOnlyOwnerOrAdmin(Event event) {
        UUID currentUserId = getOrganizerIdFromJwt();
        boolean isAdmin = jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");

        if (!event.organizerId.equals(currentUserId) && !isAdmin) {
            throw new ForbiddenException("Not the event owner");
        }
    }

    /**
     * Extract organizer ID from JWT subject.
     * Handles both UUID (production) and Auth0 ID (test) formats.
     * For Auth0 IDs, derives a deterministic UUID using namespace-based UUID.
     */
    private UUID getOrganizerIdFromJwt() {
        String subject = jwt.getSubject();
        if (subject == null) {
            // Fallback for tests without proper JWT
            return UUID.fromString("00000000-0000-0000-0000-000000000000");
        }
        
        try {
            // Try parsing directly as UUID (production case)
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            // Subject is Auth0 ID or other string format (test case)
            // Derive a deterministic UUID from the string
            return UUID.nameUUIDFromBytes(subject.getBytes());
        }
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

    private ch.unige.pinfo.event.model.EligibilityRule convertEligibilityRule(
            ch.unige.pinfo.event.openapi.model.EligibilityRule apiRule) {
        if (apiRule == null)
            return null;
        ch.unige.pinfo.event.model.EligibilityRule entityRule = new ch.unige.pinfo.event.model.EligibilityRule();
        entityRule.faculties = apiRule.getFaculties();
        entityRule.majors = apiRule.getMajors();
        if (apiRule.getDegreeLevels() != null) {
            entityRule.degreeLevels = apiRule.getDegreeLevels().stream()
                    .map(Enum::toString)
                    .toList();
        }
        return entityRule;
    }
}
