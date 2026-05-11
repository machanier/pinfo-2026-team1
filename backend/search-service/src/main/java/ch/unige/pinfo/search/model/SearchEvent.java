package ch.unige.pinfo.search.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "search_events")
public class SearchEvent extends PanacheEntityBase {

    @Id
    public UUID eventId;

    @Column(nullable = false)
    public String title;

    @Column(columnDefinition = "TEXT")
    public String description;

    public String place;

    public OffsetDateTime time;

    public OffsetDateTime endTime;

    public String category;

    // Stockage des tags sous forme de liste (PostgreSQL gère très bien les
    // collections)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_tags", joinColumns = @JoinColumn(name = "event_id"))
    public List<String> tags;

    public UUID organizerId;

    public String organizerName;

    public Integer capacity;

    public Integer registeredCount;

    public Boolean isFull;

    // --- Champs d'éligibilité mis à plat pour le filtrage rapide ---

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_eligible_faculties", joinColumns = @JoinColumn(name = "event_id"))
    public List<String> eligibleFaculties;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_eligible_degree_levels", joinColumns = @JoinColumn(name = "event_id"))
    public List<String> eligibleDegreeLevels;

    // Méthode utilitaire pour calculer les slots restants
    @Transient
    public Integer getAvailableSlots() {
        if (capacity == null)
            return null;
        return Math.max(0, capacity - registeredCount);
    }
}