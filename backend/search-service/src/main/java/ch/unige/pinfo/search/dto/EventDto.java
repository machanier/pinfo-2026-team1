package ch.unige.pinfo.search.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class EventDto {

    @JsonProperty("eventId")
    private UUID eventId;

    // --- Nouveaux champs pour la recherche plein texte ---
    @JsonProperty("title")
    private String title;

    @JsonProperty("description")
    private String description;

    @JsonProperty("place")
    private String place;

    @JsonProperty("category")
    private String category;

    @JsonProperty("tags")
    private List<String> tags;

    // --- Infos Organisateur ---
    @JsonProperty("organizerId")
    private String organizerId;

    @JsonProperty("organizerName")
    private String organizerName;

    // --- Métriques et Statuts ---
    @JsonProperty("status")
    private String status;

    @JsonProperty("capacity")
    private Integer capacity;

    @JsonProperty("registeredCount")
    private Integer registeredCount;

    @JsonProperty("time")
    private OffsetDateTime time;

    @JsonProperty("endTime")
    private OffsetDateTime endTime;

    @JsonProperty("restrictedTo")
    private EligibilityRuleDto restrictedTo;

    // Getters et Setters pour les nouveaux champs
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getOrganizerName() {
        return organizerName;
    }

    public void setOrganizerName(String organizerName) {
        this.organizerName = organizerName;
    }

    // Getters existants
    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public String getOrganizerId() {
        return organizerId;
    }

    public void setOrganizerId(String organizerId) {
        this.organizerId = organizerId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public EligibilityRuleDto getRestrictedTo() {
        return restrictedTo;
    }

    public void setRestrictedTo(EligibilityRuleDto restrictedTo) {
        this.restrictedTo = restrictedTo;
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
}