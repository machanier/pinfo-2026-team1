package ch.unige.pinfo.notification.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

class NotificationTypeTest {

    @Test
    void testEnumContainsExpectedValues() {
        assertNotNull(NotificationType.valueOf("REGISTRATION_CONFIRMED"));
        assertNotNull(NotificationType.valueOf("REGISTRATION_CANCELLED"));
        assertNotNull(NotificationType.valueOf("WAITLIST_PROMOTED"));
        assertNotNull(NotificationType.valueOf("EVENT_UPDATED"));
        assertNotNull(NotificationType.valueOf("EVENT_CANCELLED"));
        assertNotNull(NotificationType.valueOf("ANNOUNCEMENT"));
        assertNotNull(NotificationType.valueOf("REMINDER"));
        assertNotNull(NotificationType.valueOf("SLOT_AVAILABLE"));

        // also verify the number of enum constants hasn't changed unexpectedly
        assertEquals(8, NotificationType.values().length);
    }
}
