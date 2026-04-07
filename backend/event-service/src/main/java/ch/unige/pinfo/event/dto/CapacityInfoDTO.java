package ch.unige.pinfo.event.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public class CapacityInfoDTO {

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

    public CapacityInfoDTO() {
    }

    public CapacityInfoDTO(UUID eventId, Integer capacity, Integer registeredCount) {
        this.eventId = eventId;
        this.capacity = capacity;
        this.registeredCount = registeredCount;

        if (capacity != null) {
            this.availableSlots = capacity - registeredCount;
            this.isFull = this.availableSlots <= 0;
        } else {
            this.availableSlots = null;
            this.isFull = false;
        }
    }

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