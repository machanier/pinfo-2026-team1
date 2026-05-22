package ch.unige.pinfo.event.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

import ch.unige.pinfo.event.openapi.model.EventStatus;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events", indexes = {
        // Covers the common public query: status = PUBLISHED AND time >= :after
        // Also used by CalendarService for status + date-range filtering.
        @Index(name = "idx_events_status_time", columnList = "status, time"),
        // Covers organizer-scoped listing: organizerId = :id (optionally + status/time)
        @Index(name = "idx_events_organizer_id", columnList = "organizerId")
})
public class Event extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID eventId;

    @Column(nullable = false)
    public UUID organizerId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    public EventStatus status;

    @Column(nullable = false)
    public OffsetDateTime createdAt;

    @Column(nullable = false)
    public OffsetDateTime updatedAt;

    @Column(nullable = false)
    public String title;

    public String description;

    @Column(nullable = false)
    public String place;

    @Column(nullable = false)
    public OffsetDateTime time;

    public OffsetDateTime endTime;

    public Integer capacity;

    public String category;

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    public List<String> tags = new ArrayList<>();

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    public EligibilityRule restrictedTo;

    @Column(columnDefinition = "TEXT")
    @Basic(fetch = FetchType.LAZY)
    public String bannerImageUrl;

    // Save the current time when creating a new event before persisting in the
    // database
    @PrePersist
    public void saveCreationTime() {
        OffsetDateTime dateTime = OffsetDateTime.now();
        this.createdAt = dateTime;
        this.updatedAt = dateTime;
    }

    // Save the current time when updating an event before updating in the database
    @PreUpdate
    public void saveUpdateTime() {
        OffsetDateTime dateTime = OffsetDateTime.now();
        this.updatedAt = dateTime;
    }

}