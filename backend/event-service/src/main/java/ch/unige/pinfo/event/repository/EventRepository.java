package ch.unige.pinfo.event.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import ch.unige.pinfo.event.model.Event;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class EventRepository implements PanacheRepository<Event> {

    public Optional<Event> findByEventId(UUID eventId) {
        return find("eventId", eventId).firstResultOptional();
    }
}
