package ch.unige.pinfo.event.repository;

import ch.unige.pinfo.event.model.Announcement;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class AnnouncementRepository implements PanacheRepositoryBase<Announcement, UUID> {

}