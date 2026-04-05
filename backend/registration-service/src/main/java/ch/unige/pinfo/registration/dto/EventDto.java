package ch.unige.pinfo.registration.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public class EventDto {

    @JsonProperty("eventId")
    private UUID eventId;

    @JsonProperty("status")
    private String status;

    @JsonProperty("restrictedTo")
    private EligibilityRuleDto restrictedTo;

    @JsonProperty("capacity")
    private Integer capacity;

    @JsonProperty("registeredCount")
    private Integer registeredCount;

    @JsonProperty("time")
    private OffsetDateTime time;

    @JsonProperty("endTime")
    private OffsetDateTime endTime;

    public UUID getEventId() {
        return eventId;
    }

    public String getStatus() {
        return status;
    }

    public EligibilityRuleDto getRestrictedTo() {
        return restrictedTo;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public Integer getRegisteredCount() {
        return registeredCount;
    }

    public OffsetDateTime getTime() {
        return time;
    }

    public OffsetDateTime getEndTime() {
        return endTime;
    }
}