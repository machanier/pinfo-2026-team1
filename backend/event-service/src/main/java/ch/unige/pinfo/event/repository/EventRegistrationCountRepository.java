package ch.unige.pinfo.event.repository;

import ch.unige.pinfo.event.model.EventRegistrationCount;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class EventRegistrationCountRepository implements PanacheRepositoryBase<EventRegistrationCount, UUID> {
}
