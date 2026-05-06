package ch.unige.pinfo.registration.dto;

import io.quarkus.test.junit.QuarkusTest;
import io.vertx.core.json.JsonObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class EventDtoTest {

    @Test
    @DisplayName("Should verify all getters and reflection-based injection")
    void testGettersAndDeserialization() {
        // GIVEN
        UUID id = UUID.randomUUID();
        OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime end = start.plusHours(2);

        // On simule un JSON car les champs n'ont pas de setters (sauf status et
        // restrictedTo)
        JsonObject json = new JsonObject()
                .put("eventId", id.toString())
                .put("organizerId", "org-123")
                .put("status", "OPEN")
                .put("capacity", 50)
                .put("registeredCount", 10)
                .put("time", start.toString())
                .put("endTime", end.toString());

        // WHEN
        EventDto dto = json.mapTo(EventDto.class);

        // THEN
        assertAll("Getters validation",
                () -> assertEquals(id, dto.getEventId()),
                () -> assertEquals("org-123", dto.getOrganizerId()),
                () -> assertEquals("OPEN", dto.getStatus()),
                () -> assertEquals(50, dto.getCapacity()),
                () -> assertEquals(10, dto.getRegisteredCount()),
                // Utilisation de isEqual pour comparer les OffsetDateTime (ignore les
                // différences de zone si besoin)
                () -> assertTrue(start.isEqual(dto.getTime())),
                () -> assertTrue(end.isEqual(dto.getEndTime())));
    }

    @Test
    @DisplayName("Should verify setters for mutable fields")
    void testSetters() {
        // GIVEN
        EventDto dto = new EventDto();
        String newStatus = "CLOSED";
        EligibilityRuleDto rule = new EligibilityRuleDto();

        // WHEN
        dto.setStatus(newStatus);
        dto.setRestrictedTo(rule);

        // THEN
        assertEquals(newStatus, dto.getStatus());
        assertEquals(rule, dto.getRestrictedTo());
    }

    @Test
    @DisplayName("Should ensure null safety for nested objects")
    void testNullFields() {
        EventDto dto = new EventDto();
        assertNull(dto.getRestrictedTo(), "Nested DTO should be null if not set");
        assertNull(dto.getEventId());
    }
}