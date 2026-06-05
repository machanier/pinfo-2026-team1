package ch.unige.pinfo.search.repository;

import ch.unige.pinfo.search.model.SearchOrganizer; // Ton entité
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;

@ApplicationScoped
public class OrganizerSearchRepository implements PanacheRepositoryBase<SearchOrganizer, UUID> {

}