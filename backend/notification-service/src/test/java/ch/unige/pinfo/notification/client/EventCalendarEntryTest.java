package ch.unige.pinfo.notification.client;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class EventCalendarEntryTest {

    @Test
    @DisplayName("Should successfully set and get all public fields")
    void testFieldAssignments() {
        // Given
        EventCalendarEntry entry = new EventCalendarEntry();
        UUID expectedEventId = UUID.randomUUID();
        String expectedTitle = "PINFO Project Presentation";
        String expectedPlace = "Uni Mail, Room MR280";
        OffsetDateTime expectedTime = OffsetDateTime.parse("2026-06-03T14:00:00Z");
        OffsetDateTime expectedEndTime = OffsetDateTime.parse("2026-06-03T16:00:00Z");

        // When
        entry.eventId = expectedEventId;
        entry.title = expectedTitle;
        entry.place = expectedPlace;
        entry.time = expectedTime;
        entry.endTime = expectedEndTime;

        // Then
        assertNotNull(entry);
        assertEquals(expectedEventId, entry.eventId, "Event ID should match the assigned value");
        assertEquals(expectedTitle, entry.title, "Title should match the assigned value");
        assertEquals(expectedPlace, entry.place, "Place should match the assigned value");
        assertEquals(expectedTime, entry.time, "Start time should match the assigned value");
        assertEquals(expectedEndTime, entry.endTime, "End time should match the assigned value");
    }

    @Test
    @DisplayName("Should initialize fields as null by default")
    void testDefaultConstructor() {
        // When
        EventCalendarEntry entry = new EventCalendarEntry();

        // Then
        assertNull(entry.eventId);
        assertNull(entry.title);
        assertNull(entry.place);
        assertNull(entry.time);
        assertNull(entry.endTime);
    }
}