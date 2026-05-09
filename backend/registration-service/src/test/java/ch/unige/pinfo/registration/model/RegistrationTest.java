package ch.unige.pinfo.registration.model;

import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class RegistrationTest {

    @Test
    @DisplayName("Should verify all getters and setters for Jacoco coverage")
    void testGettersAndSetters() {
        // GIVEN
        Registration registration = new Registration();
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        String studentId = "student-42";
        RegistrationStatus status = RegistrationStatus.CONFIRMED;
        OffsetDateTime now = OffsetDateTime.now();
        Integer position = 1;

        // WHEN
        registration.setRegistrationId(regId);
        registration.setEventId(eventId);
        registration.setStudentId(studentId);
        registration.setStatus(status);
        registration.setDate(now);
        registration.setPos(position);

        // THEN
        assertAll("Entity mapping validation",
                () -> assertEquals(regId, registration.getRegistrationId()),
                () -> assertEquals(eventId, registration.getEventId()),
                () -> assertEquals(studentId, registration.getStudentId()),
                () -> assertEquals(status, registration.getStatus()),
                () -> assertEquals(now, registration.getDate()),
                () -> assertEquals(position, registration.getPos()));
    }

    @Test
    @DisplayName("Should ensure new instance has null fields")
    void testInitialState() {
        Registration registration = new Registration();
        assertNull(registration.getRegistrationId());
        assertNull(registration.getEventId());
        assertNull(registration.getStatus());
        assertNull(registration.getPos());
    }
}