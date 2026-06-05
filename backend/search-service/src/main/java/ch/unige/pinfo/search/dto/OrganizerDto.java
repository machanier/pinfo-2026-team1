package ch.unige.pinfo.search.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

/**
 * DTO utilisé pour transporter les informations de l'organisateur
 * via Kafka pour le service de recherche.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrganizerDto {

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("associationName")
    private String associationName;

    @JsonProperty("description")
    private String description;

    @JsonProperty("logoUrl")
    private String logoUrl;

    @JsonProperty("verified")
    private boolean verified;

    @JsonProperty("upcomingEventCount")
    private Integer upcomingEventCount;

    // Constructeur par défaut nécessaire pour Jackson
    public OrganizerDto() {
    }

    // Getters et Setters

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getAssociationName() {
        return associationName;
    }

    public void setAssociationName(String associationName) {
        this.associationName = associationName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public Integer getUpcomingEventCount() {
        return upcomingEventCount;
    }

    public void setUpcomingEventCount(Integer upcomingEventCount) {
        this.upcomingEventCount = upcomingEventCount;
    }
}