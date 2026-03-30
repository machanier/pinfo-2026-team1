package ch.unige.pinfo.user.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class UserTest {

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
    }

    @Test
    void testSetAndGetEmail() {
        user.setEmail("test@unige.ch");
        assertEquals("test@unige.ch", user.getEmail());
    }

    @Test
    void testSetAndGetName() {
        user.setName("John Doe");
        assertEquals("John Doe", user.getName());
    }

    @Test
    void testSetAndGetPicture() {
        user.setPicture("https://example.com/photo.jpg");
        assertEquals("https://example.com/photo.jpg", user.getPicture());
    }

    @Test
    void testSetAndGetRole() {
        user.setRole("Admin");
        assertEquals("Admin", user.getRole());
    }

    @Test
    void testSetAndGetAuth0Id() {
        user.auth0Id = "auth0|123456";
        assertEquals("auth0|123456", user.auth0Id);
    }

    @Test
    void testAuth0IdFieldConstant() {
        assertEquals("auth0Id", User.AUTH0_ID_FIELD);
    }

    @Test
    void testDefaultValuesAreNull() {
        assertNull(user.getEmail());
        assertNull(user.getName());
        assertNull(user.getPicture());
        assertNull(user.getRole());
        assertNull(user.auth0Id);
        assertNull(user.id);
    }

    @Test
    void testSetEmailNull() {
        user.setEmail("test@unige.ch");
        user.setEmail(null);
        assertNull(user.getEmail());
    }

    @Test
    void testSetNameNull() {
        user.setName("Jean");
        user.setName(null);
        assertNull(user.getName());
    }
}