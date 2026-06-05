package ch.unige.pinfo.registration.dto;

import io.vertx.core.json.JsonObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CapacityDtoTest {

    @Test
    @DisplayName("Should correctly deserialize and expose fields via getters")
    void testGettersAndDeserialization() {
        // GIVEN: Un JSON correspondant à la structure du DTO
        UUID eventId = UUID.randomUUID();
        Integer capacity = 100;
        Integer registeredCount = 60;
        Integer availableSlots = 40;
        Boolean isFull = false;

        JsonObject json = new JsonObject()
                .put("eventId", eventId.toString())
                .put("capacity", capacity)
                .put("registeredCount", registeredCount)
                .put("availableSlots", availableSlots)
                .put("isFull", isFull);

        // WHEN: Désérialisation (simule l'arrivée d'un payload API)
        CapacityDto dto = json.mapTo(CapacityDto.class);

        // THEN: On vérifie chaque getter pour Jacoco et la validité des données
        assertAll("DTO validation",
                () -> assertEquals(eventId, dto.getEventId(), "EventId should match"),
                () -> assertEquals(capacity, dto.getCapacity(), "Capacity should match"),
                () -> assertEquals(registeredCount, dto.getRegisteredCount(), "RegisteredCount should match"),
                () -> assertEquals(availableSlots, dto.getAvailableSlots(), "AvailableSlots should match"),
                () -> assertEquals(isFull, dto.getIsFull(), "IsFull status should match"));
    }

    @Test
    @DisplayName("Should handle null values gracefully")
    void testNullFields() {
        // Test de robustesse souvent demandé par Sonar pour éviter les NPE imprévus
        // ailleurs
        CapacityDto dto = new CapacityDto();

        assertNull(dto.getEventId());
        assertNull(dto.getCapacity());
        assertNull(dto.getIsFull());
    }
}