package ch.unige.pinfo.registration.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public class CapacityDto {

    @JsonProperty("eventId")
    private UUID eventId;

    @JsonProperty("capacity")
    private Integer capacity;

    @JsonProperty("registeredCount")
    private Integer registeredCount;

    @JsonProperty("availableSlots")
    private Integer availableSlots;

    @JsonProperty("isFull")
    private Boolean isFull;

    public UUID getEventId() {
        return eventId;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public Integer getRegisteredCount() {
        return registeredCount;
    }

    public Integer getAvailableSlots() {
        return availableSlots;
    }

    public Boolean getIsFull() {
        return isFull;
    }
}