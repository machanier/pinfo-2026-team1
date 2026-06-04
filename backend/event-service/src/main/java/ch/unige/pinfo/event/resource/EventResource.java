package ch.unige.pinfo.event.resource;

import org.eclipse.microprofile.jwt.JsonWebToken;
import ch.unige.pinfo.event.mapper.EventMapper;
import ch.unige.pinfo.event.openapi.api.BannerApi;
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
import io.quarkus.security.identity.SecurityIdentity;
import org.jboss.resteasy.reactive.ResponseStatus;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
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
public class EventResource implements EventsApi, BannerApi {

    @Inject
    EventService eventService;

    @Inject
    EventMapper eventMapper;

    @Inject
    JsonWebToken jwt;

    @Inject
    SecurityIdentity securityIdentity;

    @Override
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public EventPage apiEventsGet(
            @QueryParam("organizerId") UUID organizerId,
            @QueryParam("status") EventStatus status,
            @QueryParam("after") OffsetDateTime after,
            @QueryParam("page") @DefaultValue("0") Integer page,
            @QueryParam("size") @DefaultValue("20") Integer size) {

        UUID requesterId = tryGetOrganizerIdFromJwt();
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
        UUID organizerId = getOrganizerIdFromJwt();

        Event event = new Event();
        event.organizerId = organizerId;
        event.organizerName = getOrganizerNameFromJwt();
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
    @Path("/{eventId}/submit")
    public EventResponse apiEventsEventIdSubmitPatch(@PathParam("eventId") UUID eventId) {
        return submitEvent(eventId);
    }

    private EventResponse submitEvent(UUID eventId) {
        try {
            Event event = eventService.getEventById(eventId)
                    .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
            allowOnlyOwnerOrAdmin(event);

            Event submittedEvent = eventService.submitEvent(eventId);
            return mapToEventResponse(submittedEvent);
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

        UUID requesterId = tryGetOrganizerIdFromJwt();

        // DRAFT, PENDING_MODERATION, and CANCELLED events are only visible to
        // the owning organizer and admins. Return 404 (not 403) to avoid leaking
        // their existence.
        boolean hiddenFromPublic = event.status == EventStatus.DRAFT
                || event.status == EventStatus.PENDING_MODERATION
                || event.status == EventStatus.CANCELLED;

        if (hiddenFromPublic) {
            boolean isOwner = requesterId != null && event.organizerId.equals(requesterId);
            if (!isAdmin() && !isOwner) {
                throw new NotFoundException("Event not found: " + eventId);
            }
        }

        boolean requesterIsOrganizer = requesterId != null && event.organizerId.equals(requesterId);
        int registeredCount = eventService.getRegisteredCount(event.eventId);
        return eventMapper.toEventResponse(event, registeredCount, requesterIsOrganizer);
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

        // Review B3: a CANCELLED event is terminal. The state machine
        // (EventStateFactory) guards status *transitions*, but updateEvent mutates
        // content fields without consulting it — so editing a cancelled event would
        // re-broadcast event.updated and wrongly re-notify its (already-cancelled)
        // participants. Reject the edit instead.
        if (event.status == EventStatus.CANCELLED) {
            throw new WebApplicationException("Cannot edit a cancelled event", 409);
        }

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

        // An event can now be deleted at any status; deleteEvent signals downstream
        // (event.cancelled) for events that were already visible.
        eventService.deleteEvent(eventId);
    }

    private EventResponse mapToEventResponse(Event event) {
        int registeredCount = eventService.getRegisteredCount(event.eventId);
        return eventMapper.toEventResponse(event, registeredCount);
    }

    private void allowOnlyOwnerOrAdmin(Event event) {
        UUID currentUserId = getOrganizerIdFromJwt();

        if (!event.organizerId.equals(currentUserId) && !isAdmin()) {
            throw new ForbiddenException("Not the event owner");
        }
    }

    private boolean isAdmin() {
        return securityIdentity.hasRole("ADMIN");
    }

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

    /**
     * Organizer display name from the JWT — the namespaced Auth0 claim the rest of the
     * platform uses (same as user-service's UserSyncService), falling back to the standard
     * "name" claim. Stored on the event at creation so the moderation queue and event pages
     * show a readable name instead of the raw organizer UUID. Returns null if absent.
     */
    private String getOrganizerNameFromJwt() {
        String name = claimAsTrimmedString("https://unigevents.com/name");
        return name != null ? name : claimAsTrimmedString("name");
    }

    /**
     * Reads a JWT claim as a plain string, stripping the surrounding quotes some token
     * sources wrap string claims in (mirrors user-service's UserSyncService.safeGetClaim).
     * Returns null when the claim is absent or blank.
     */
    private String claimAsTrimmedString(String claimName) {
        Object val = jwt.getClaim(claimName);
        if (val == null) {
            return null;
        }
        String s = String.valueOf(val).replace("\"", "").trim();
        return s.isBlank() ? null : s;
    }

    /**
     * Extract organizer ID from JWT subject.
     * Handles both UUID (production) and Auth0 ID (test) formats.
     * For Auth0 IDs, derives a deterministic UUID using namespace-based UUID.
     *
     * @throws NotAuthorizedException if subject claim is missing or invalid
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
            // Auth0 format: "auth0|organizer-123", derive deterministic UUID
            return UUID.nameUUIDFromBytes(subject.getBytes(StandardCharsets.UTF_8));
        }
    }

    private ch.unige.pinfo.event.model.EligibilityRule convertEligibilityRule(
            ch.unige.pinfo.event.openapi.model.EligibilityRule apiRule) {
        return eventMapper.toEntityEligibilityRule(apiRule);
    }
}
