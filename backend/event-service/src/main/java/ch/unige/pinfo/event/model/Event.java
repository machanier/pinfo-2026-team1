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
@Table(name = "events")
public class Event extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID eventId;

    @Column(nullable = false)
    public UUID organizerId;

    @Column(nullable = false)
    private String place;

    @Column(nullable = false)
    private OffsetDateTime time;

    @Column
    private OffsetDateTime endTime;

    @Column(nullable = false)
    private String organizerId;

    @Column
    private String organizerName;

    @Column
    private Integer capacity;

    @Column(nullable = false)
    private Integer registeredCount = 0;

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

    // Save the current time when creating a new event before persisting in the
    // database
    @PrePersist
    public void saveCreationTime() {
        OffsetDateTime dateTime = OffsetDateTime.now();
        this.createdAt = dateTime;
        this.updatedAt = dateTime;
    }

    <<<<<<<HEAD

    // Save the current time when updating an event before updating in the database
    @PreUpdate
    public void saveUpdateTime() {
        OffsetDateTime dateTime = OffsetDateTime.now();
        this.updatedAt = dateTime;
    }

    =======

    public Event(String title, String place, OffsetDateTime time, String organizerId, String organizerName) {
        this.title = title;
        this.place = place;
        this.time = time;
        this.organizerId = organizerId;
        this.organizerName = organizerName;
        this.status = EventStatus.DRAFT;
        this.registeredCount = 0;
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    // Getters and Setters
    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPlace() {
        return place;
    }

    public void setPlace(String place) {
        this.place = place;
    }

    public OffsetDateTime getTime() {
        return time;
    }

    public void setTime(OffsetDateTime time) {
        this.time = time;
    }

    public OffsetDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(OffsetDateTime endTime) {
        this.endTime = endTime;
    }

    public String getOrganizerId() {
        return organizerId;
    }

    public void setOrganizerId(String organizerId) {
        this.organizerId = organizerId;
    }

    public String getOrganizerName() {
        return organizerName;
    }

    public void setOrganizerName(String organizerName) {
        this.organizerName = organizerName;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public Integer getRegisteredCount() {
        return registeredCount;
    }

    public void setRegisteredCount(Integer registeredCount) {
        this.registeredCount = registeredCount;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public String getRestrictedToJson() {
        return restrictedToJson;
    }

    public void setRestrictedToJson(String restrictedToJson) {
        this.restrictedToJson = restrictedToJson;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }>>>>>>>

    b96d6d0 (feature(PINFO-120) : Implémentation du GET des regs pour un Organizer. A hotfix avec les vraies implémentations)
}
