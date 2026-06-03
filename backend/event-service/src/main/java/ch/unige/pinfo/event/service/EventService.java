package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.CapacityInfo;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import ch.unige.pinfo.event.repository.EventRegistrationCountRepository;
import ch.unige.pinfo.event.service.state.EventStateFactory;
import ch.unige.pinfo.event.messaging.EventChangePublisher;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import org.hibernate.Hibernate;

@ApplicationScoped
public class EventService {

    @Inject
    EventRepository eventRepository;

    @Inject
    EventChangePublisher eventPublisher;

    @Inject
    EventRegistrationCountRepository registrationCountRepository;

    /**
     * Gets all events according to a set of filters. If no filter is given, gets
     * all events.
     * 
     * @param organizerId the ID of an organizer to filter by
     * @param status      the status (DRAFT, PUBLISHED, CANCELLED) to filter by
     * @return the query according to the filters
     */
    public PanacheQuery<Event> getEvents(UUID organizerId, EventStatus status, OffsetDateTime after) {
        Map<String, Object> parameters = new HashMap<>();
        if (organizerId != null)
            parameters.put("organizerId", organizerId);
        if (status != null)
            parameters.put("status", status);

        // Build clauses: equality filters from the map, then the range filter for
        // `after`
        List<String> clauses = new ArrayList<>(
                parameters.keySet().stream().map(key -> key + " = :" + key).toList());
        if (after != null) {
            parameters.put("after", after);
            clauses.add("time >= :after");
        }

        if (clauses.isEmpty()) {
            return eventRepository.findAll();
        }

        return eventRepository.find(String.join(" AND ", clauses), parameters);
    }

    /**
     * Fetches a page of events and initializes the lazy bannerImageUrl
     * field on each result, all within a single transaction so the connection is
     * released before mapping/serialization occurs in the resource layer.
     */
    @Transactional
    public List<Event> getEventsPage(UUID organizerId, EventStatus status, OffsetDateTime after, int page, int size) {
        List<Event> events = getEvents(organizerId, status, after).page(page, size).list();
        events.forEach(e -> Hibernate.initialize(e.bannerImageUrl));
        return events;
    }

    /**
     * Creates an event in DRAFT status and persists it in the database.
     * 
     * @param request contains the information of the event to create
     * @return the created event
     */
    @Transactional
    public Event createEvent(Event request) {
        Event event = new Event();
        event.organizerId = request.organizerId;
        event.organizerName = request.organizerName;
        event.status = EventStatus.DRAFT;
        event.saveCreationTime();
        event.updatedAt = event.createdAt;
        event.title = request.title;
        event.description = request.description;
        event.place = request.place;
        event.time = request.time;
        event.endTime = request.endTime;
        event.capacity = request.capacity;
        event.category = request.category;
        event.tags = request.tags;
        event.restrictedTo = request.restrictedTo;

        eventRepository.persist(event);
        Hibernate.initialize(event.bannerImageUrl);
        return event;
    }

    /**
     * Submits a DRAFT event for moderation, transitioning it to
     * PENDING_MODERATION status and publishing event.submitted to Kafka.
     * 
     * @param eventId the ID of the event to publish
     * @return the updated event
     * @throws IllegalStateException    if the event cannot be submitted
     *                                  (e.g., not in DRAFT status)
     * @throws IllegalArgumentException if the event does not exist
     */
    @Transactional
    public Event submitEvent(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        // Get current state and apply transition (validates + executes)
        var currentState = EventStateFactory.getState(event.status);
        currentState.applyTransition(event, EventStatus.PENDING_MODERATION);

        // Persist the updated event
        eventRepository.persist(event);

        // Publish Kafka event for moderation.
        eventPublisher.eventSubmitted(event);
        Hibernate.initialize(event.bannerImageUrl);
        return event;
    }

    /**
     * Marks an existing event as PENDING_MODERATION (used when automated screening
     * flags an update). This reuses the same state transition logic as a manual
     * submit.
     */
    @Transactional
    public Event markPendingModeration(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        if (event.status == EventStatus.PENDING_MODERATION) {
            Hibernate.initialize(event.bannerImageUrl);
            return event;
        }

        var currentState = EventStateFactory.getState(event.status);
        currentState.applyTransition(event, EventStatus.PENDING_MODERATION);

        eventRepository.persist(event);
        // notify downstream that status changed
        eventPublisher.eventUpdated(event);
        Hibernate.initialize(event.bannerImageUrl);
        return event;
    }

    /**
     * Cancels a PUBLISHED event, transitioning it to CANCELLED status.
     * 
     * @param eventId the ID of the event to cancel
     * @return the updated event
     * @throws IllegalStateException    if the event cannot be cancelled
     *                                  (e.g., still in DRAFT or already cancelled)
     * @throws IllegalArgumentException if the event does not exist
     */
    @Transactional
    public Event cancelEvent(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        // Get current state and apply transition (validates + executes)
        var currentState = EventStateFactory.getState(event.status);
        currentState.applyTransition(event, EventStatus.CANCELLED);

        // Persist the updated event
        eventRepository.persist(event);

        // Publish Kafka event
        eventPublisher.eventCancelled(event.eventId, event.organizerId);
        Hibernate.initialize(event.bannerImageUrl);
        return event;
    }

    /**
     * Retrieves an event by its ID.
     * 
     * @param eventId the ID of the event
     * @return an Optional containing the event if found, empty otherwise
     */
    @Transactional
    public Optional<Event> getEventById(UUID eventId) {
        Optional<Event> result = eventRepository.findByIdOptional(eventId);
        result.ifPresent(e -> Hibernate.initialize(e.bannerImageUrl));
        return result;
    }

    /**
     * Updates an event with new information.
     * 
     * @param eventId    the ID of the event to update
     * @param updateData contains the fields to update
     * @return the updated event
     * @throws IllegalArgumentException if the event does not exist
     */
    @Transactional
    public Event updateEvent(UUID eventId, Event updateData) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        if (updateData.title != null)
            event.title = updateData.title;
        if (updateData.description != null)
            event.description = updateData.description;
        if (updateData.place != null)
            event.place = updateData.place;
        if (updateData.time != null)
            event.time = updateData.time;
        if (updateData.endTime != null)
            event.endTime = updateData.endTime;
        if (updateData.capacity != null)
            event.capacity = updateData.capacity;
        if (updateData.category != null)
            event.category = updateData.category;
        if (updateData.tags != null)
            event.tags = updateData.tags;
        if (updateData.restrictedTo != null)
            event.restrictedTo = updateData.restrictedTo;
        if (updateData.bannerImageUrl != null)
            event.bannerImageUrl = updateData.bannerImageUrl;

        event.updatedAt = OffsetDateTime.now();
        eventRepository.persist(event);

        // Publish Kafka event
        eventPublisher.eventUpdated(event);
        Hibernate.initialize(event.bannerImageUrl);
        return event;
    }

    /**
     * Deletes a DRAFT event permanently.
     *
     * @param eventId the ID of the event to delete
     * @throws IllegalArgumentException if the event does not exist
     * @throws IllegalStateException    if the event is not in DRAFT status
     */
    @Transactional
    public void deleteEvent(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        if (event.status != EventStatus.DRAFT) {
            throw new IllegalStateException("Cannot hard-delete a PUBLISHED, PENDING_MODERATION or CANCELLED event");
        }

        eventRepository.delete(event);
    }

    /**
     * Applies moderation decision consumed from Kafka.
     * APPROVED transitions to PUBLISHED and REJECTED returns the event to DRAFT.
     * In both cases the updated status is published to downstream consumers.
     */
    @Transactional
    public void applyModerationDecision(UUID eventId, String moderationStatus) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        if ("APPROVED".equalsIgnoreCase(moderationStatus)) {
            var currentState = EventStateFactory.getState(event.status);
            currentState.applyTransition(event, EventStatus.PUBLISHED);
            eventRepository.persist(event);
            eventPublisher.eventUpdated(event);
            return;
        }

        if ("REJECTED".equalsIgnoreCase(moderationStatus)) {
            var currentState = EventStateFactory.getState(event.status);
            currentState.applyTransition(event, EventStatus.DRAFT);
            event.updatedAt = OffsetDateTime.now();
            eventRepository.persist(event);
            eventPublisher.eventUpdated(event);
        }
    }

    /**
     * Returns the current registered count for an event (0 if no registrations
     * yet).
     *
     * @param eventId the ID of the event
     * @return the number of confirmed registrations
     */
    public int getRegisteredCount(UUID eventId) {
        return registrationCountRepository.findByIdOptional(eventId)
                .map(c -> c.registeredCount)
                .orElse(0);
    }

    /**
     * Batch-fetches registered counts for a list of events in a single IN query,
     * avoiding the N+1 problem when listing events.
     *
     * @param eventIds the IDs to look up
     * @return a map from eventId to registeredCount; absent entries mean 0
     */
    public Map<UUID, Integer> getBatchRegisteredCounts(List<UUID> eventIds) {
        return registrationCountRepository.findByEventIds(eventIds).stream()
                .collect(Collectors.toMap(c -> c.eventId, c -> c.registeredCount));
    }

    /**
     * Returns capacity information for an event.
     *
     * registeredCount reflects the confirmed-registration projection
     * maintained by
     * {@link ch.unige.pinfo.event.messaging.RegistrationEventConsumer}
     * via the {@code registration.confirmed} / {@code registration.cancelled} Kafka
     * topics.
     *
     * @param eventId the ID of the event
     * @return a {@link CapacityInfo} snapshot
     * @throws IllegalArgumentException if the event does not exist
     */
    public CapacityInfo getCapacityInfo(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        int registeredCount = registrationCountRepository.findByIdOptional(eventId)
                .map(c -> c.registeredCount)
                .orElse(0);

        CapacityInfo info = new CapacityInfo();
        info.setEventId(event.eventId);
        info.setCapacity(event.capacity);
        info.setRegisteredCount(registeredCount);

        if (event.capacity != null) {
            info.setAvailableSlots(Math.max(0, event.capacity - registeredCount));
            info.setIsFull(registeredCount >= event.capacity);
        } else {
            // Unlimited-capacity event
            info.setAvailableSlots(null);
            info.setIsFull(false);
        }

        return info;
    }

    /**
     * Clears the banner image URL from the event record.
     *
     * @param eventId the ID of the event
     * @return the updated event
     */
    @Transactional
    public Event clearBannerImageUrl(UUID eventId) {
        Event event = eventRepository.findByIdOptional(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        event.bannerImageUrl = null;
        event.updatedAt = OffsetDateTime.now();
        eventRepository.persist(event);
        eventPublisher.eventUpdated(event);
        Hibernate.initialize(event.bannerImageUrl);
        return event;
    }
}
