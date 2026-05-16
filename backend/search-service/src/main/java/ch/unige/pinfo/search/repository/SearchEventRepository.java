package ch.unige.pinfo.search.repository;

import ch.unige.pinfo.search.model.SearchEvent;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;

@ApplicationScoped
public class SearchEventRepository implements PanacheRepository<SearchEvent> {

    public SearchEvent findByEventId(UUID eventId) {
        return find("eventId", eventId).firstResult();
    }

    public boolean deleteByEventId(UUID eventId) {
        return delete("eventId", eventId) > 0;
    }
}