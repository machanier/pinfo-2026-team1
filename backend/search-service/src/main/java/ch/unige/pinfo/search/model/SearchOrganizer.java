package ch.unige.pinfo.search.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "search_organizers")
public class SearchOrganizer extends PanacheEntityBase {

    @Id
    public UUID userId;

    @Column(nullable = false)
    public String associationName;

    @Column(columnDefinition = "TEXT")
    public String description;

    public String logoUrl;

    public boolean verified = false;

    // On stocke le compte d'événements à venir pour le tri/affichage
    public Integer upcomingEventCount = 0;
}