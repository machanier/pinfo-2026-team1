package ch.unige.pinfo.event.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;
import ch.unige.pinfo.event.mapper.EventMapper;
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
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.List;

@Path("/api/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EventResource implements EventsApi {

    @Inject
    EventService eventService;

    @Inject
    EventMapper eventMapper;

    @Inject
    JsonWebToken jwt;

    @Override
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public EventPage apiEventsGet(
            @QueryParam("organizerId") UUID organizerId,
            @QueryParam("status") EventStatus status,
            @QueryParam("after") OffsetDateTime after,
            @QueryParam("page") @DefaultValue("0") Integer page,
            @QueryParam("size") @DefaultValue("20") Integer size) {

        String auth0Id = jwt.getSubject();
        UUID requesterId = UUID.nameUUIDFromBytes(auth0Id.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        boolean isAdmin = isAdmin();

        if (!isAdmin) {
            if (requesterId == null) {
                status = EventStatus.PUBLISHED;
            } else if (status != EventStatus.PUBLISHED) {
                // DRAFT, CANCELLED, or no filter: non-admins can only access their own
                if (organizerId == null) {
                    organizerId = requesterId;
                } else if (!organizerId.equals(requesterId)) {
                    // Viewing another organizer's events: restrict to published only
                    status = EventStatus.PUBLISHED;
                }
            }
        }

        PanacheQuery<Event> query = eventService.getEvents(organizerId, status, after);

        long totalElements = query.count();
        List<Event> events = eventService.getEventsPage(organizerId, status, after, page, size);

        // Batch-fetch registered counts in one query to avoid N+1
        List<UUID> eventIds = events.stream().map(e -> e.eventId).toList();
        Map<UUID, Integer> counts = eventService.getBatchRegisteredCounts(eventIds);

        // Build EventPage response
        EventPage eventPage = new EventPage();
        eventPage.setContent(events.stream()
                .map(e -> eventMapper.toEventResponse(e, counts.getOrDefault(e.eventId, 0)))
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
        String auth0Id = jwt.getSubject();
        UUID organizerId = UUID.nameUUIDFromBytes(auth0Id.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        Event event = new Event();
        event.organizerId = organizerId;
        event.title = createEventRequest.getTitle();
        event.description = createEventRequest.getDescription();
        event.organizerName = getOrganizerNameFromJwt();
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
    @Transactional
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
    @Transactional
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

        // Les événements non publiés ne sont visibles que par leur créateur ou les
        // admins
        if (event.status != EventStatus.PUBLISHED) {
            String auth0Id = jwt != null ? jwt.getSubject() : null;

            if (auth0Id == null && !isAdmin()) {
                throw new NotFoundException("Event not found: " + eventId);
            }

            if (auth0Id != null) {
                UUID requesterId = UUID.nameUUIDFromBytes(auth0Id.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                if (!isAdmin() && !event.organizerId.equals(requesterId)) {
                    throw new NotFoundException("Event not found: " + eventId);
                }
            }
        }

        return mapToEventResponse(event);
    }

    @Override
    @PUT
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Path("/{eventId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
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
        if (updateRequest.getBannerImageUrl() != null) {
            String url = updateRequest.getBannerImageUrl();
            if (!url.isEmpty() && !url.startsWith("https://res.cloudinary.com/")) {
                throw new WebApplicationException(
                        Response.status(Response.Status.BAD_REQUEST)
                                .entity(Map.of("message", "bannerImageUrl must be a Cloudinary URL"))
                                .build());
            }
            updateData.bannerImageUrl = url.isEmpty() ? null : url;
        }

        Event updatedEvent = eventService.updateEvent(eventId, updateData);
        return mapToEventResponse(updatedEvent);
    }

    @Override
    @DELETE
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Path("/{eventId}/banner")
    @ResponseStatus(204)
    public void apiEventsEventIdBannerDelete(@PathParam("eventId") UUID eventId) {
        Event event = eventService.getEventById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
        allowOnlyOwnerOrAdmin(event);
        eventService.clearBannerImageUrl(eventId);
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
        int registeredCount = eventService.getRegisteredCount(event.eventId);
        return eventMapper.toEventResponse(event, registeredCount);
    }

    private void allowOnlyOwnerOrAdmin(Event event) {
        String auth0Id = jwt.getSubject();
        UUID currentUserId = UUID.nameUUIDFromBytes(auth0Id.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        boolean isAdmin = jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");

        if (!event.organizerId.equals(currentUserId) && !isAdmin) {
            throw new ForbiddenException("Not the event owner");
        }
    }

    private boolean isAdmin() {
        return jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");
    }

    private ch.unige.pinfo.event.model.EligibilityRule convertEligibilityRule(
            ch.unige.pinfo.event.openapi.model.EligibilityRule apiRule) {
        return eventMapper.toEntityEligibilityRule(apiRule);
    }

    private String getOrganizerNameFromJwt() {
        // Auth0 stores the name in a custom claim
        Object nameClaim = jwt.claim("https://unigevents.com/name").orElse(null);
        if (nameClaim != null)
            return nameClaim.toString();
        // Fallback to standard claim
        String name = jwt.getName();
        return name != null ? name : jwt.getSubject();
    }
}
