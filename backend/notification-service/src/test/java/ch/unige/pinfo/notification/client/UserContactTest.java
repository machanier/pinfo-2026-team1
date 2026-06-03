package ch.unige.pinfo.notification.client;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class UserContactTest {

    @Test
    @DisplayName("Should successfully assign and read all contact fields")
    void testFieldAssignments() {
        // Given
        UserContact contact = new UserContact();
        UUID expectedUserId = UUID.randomUUID();
        String expectedName = "Alice Smith";
        String expectedEmail = "alice.smith@unige.ch";

        // When
        contact.userId = expectedUserId;
        contact.name = expectedName;
        contact.email = expectedEmail;

        // Then
        assertNotNull(contact);
        assertEquals(expectedUserId, contact.userId, "User ID should match the assigned value");
        assertEquals(expectedName, contact.name, "Name should match the assigned value");
        assertEquals(expectedEmail, contact.email, "Email should match the assigned value");
    }

    @Test
    @DisplayName("Should initialize all contact fields as null by default")
    void testDefaultConstructor() {
        // When
        UserContact contact = new UserContact();

        // Then
        assertNull(contact.userId, "Default userId should be null");
        assertNull(contact.name, "Default name should be null");
        assertNull(contact.email, "Default email should be null");
    }
}