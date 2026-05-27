package ch.unige.pinfo.event.repository;

import ch.unige.pinfo.event.model.EventRegistrationCount;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class EventRegistrationCountRepository implements PanacheRepositoryBase<EventRegistrationCount, UUID> {

    /**
     * Fetches counts for a batch of event IDs in a single IN query.
     *
     * @param eventIds the event IDs to look up
     * @return the matching {@link EventRegistrationCount} rows (absent rows mean 0)
     */
    public List<EventRegistrationCount> findByEventIds(List<UUID> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) {
            return List.of();
        }
        return list("eventId IN ?1", eventIds);
    }
}
