package ch.unige.pinfo.registration.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Test pur JUnit5, sans @QuarkusTest — aucun contexte CDI requis pour des DTOs.
class EventDtoTest {

    private static ObjectMapper mapper;

    @BeforeAll
    static void setupMapper() {
        mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Test
    @DisplayName("Should deserialize all fields correctly from JSON")
    void testGettersAndDeserialization() throws Exception {
        // GIVEN
        UUID id = UUID.randomUUID();
        OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime end = start.plusHours(2);

        String json = String.format("""
                {
                  "eventId": "%s",
                  "organizerId": "org-123",
                  "status": "OPEN",
                  "capacity": 50,
                  "registeredCount": 10,
                  "time": "%s",
                  "endTime": "%s"
                }
                """, id, start, end);

        // WHEN
        EventDto dto = mapper.readValue(json, EventDto.class);

        // THEN
        assertAll("Getters validation",
                () -> assertEquals(id, dto.getEventId()),
                () -> assertEquals("org-123", dto.getOrganizerId()),
                () -> assertEquals("OPEN", dto.getStatus()),
                () -> assertEquals(50, dto.getCapacity()),
                () -> assertEquals(10, dto.getRegisteredCount()),
                () -> assertTrue(start.isEqual(dto.getTime())),
                () -> assertTrue(end.isEqual(dto.getEndTime())));
    }

    @Test
    @DisplayName("Should verify setters for mutable fields")
    void testSetters() {
        // GIVEN
        EventDto dto = new EventDto();
        EligibilityRuleDto rule = new EligibilityRuleDto();

        // WHEN
        dto.setStatus("CLOSED");
        dto.setRestrictedTo(rule);

        // THEN
        assertEquals("CLOSED", dto.getStatus());
        assertEquals(rule, dto.getRestrictedTo());
    }

    @Test
    @DisplayName("Should ensure null safety for nested objects")
    void testNullFields() {
        EventDto dto = new EventDto();
        assertNull(dto.getRestrictedTo());
        assertNull(dto.getEventId());
    }
}