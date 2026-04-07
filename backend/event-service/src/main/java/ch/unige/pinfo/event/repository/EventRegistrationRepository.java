package ch.unige.pinfo.event.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import ch.unige.pinfo.event.model.EventRegistration;
import ch.unige.pinfo.event.model.RegistrationStatus;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class EventRegistrationRepository implements PanacheRepository<EventRegistration> {

    public List<EventRegistration> findByEventIdAndStatus(UUID eventId, RegistrationStatus status) {
        return find("eventId = ?1 and status = ?2", eventId, status).list();
    }

    public long countByEventIdAndStatus(UUID eventId, RegistrationStatus status) {
        return find("eventId = ?1 and status = ?2", eventId, status).count();
    }

    public long countByEventId(UUID eventId) {
        return find("eventId", eventId).count();
    }
}