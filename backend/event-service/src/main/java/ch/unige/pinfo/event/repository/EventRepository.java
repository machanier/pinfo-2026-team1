package ch.unige.pinfo.event.repository;

import ch.unige.pinfo.event.model.Event;
import java.util.UUID;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class EventRepository implements PanacheRepositoryBase<Event, UUID> {

}