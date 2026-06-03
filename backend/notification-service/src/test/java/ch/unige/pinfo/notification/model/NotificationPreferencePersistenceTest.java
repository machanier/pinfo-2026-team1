package ch.unige.pinfo.notification.model;

import ch.unige.pinfo.notification.repository.NotificationPreferenceRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class NotificationPreferencePersistenceTest {

    @Inject
    NotificationPreferenceRepository preferenceRepository;

    @BeforeEach
    @Transactional
    void setUp() {
        preferenceRepository.deleteAll();
    }

    @Test
    @Transactional
    void persistAndLoad_roundTripsFields() {
        UUID userId = UUID.randomUUID();
        NotificationPreference prefs = new NotificationPreference();
        prefs.userId = userId;
        prefs.emailEnabled = false;
        prefs.emailOnAnnouncement = false;
        prefs.emailOnEventUpdate = true;
        prefs.emailOnEventCancellation = false;
        prefs.emailOnRegistrationConfirmed = true;
        prefs.emailOnFreeSlot = false;
        prefs.reminderLeadTimeHours = 6;

        preferenceRepository.persist(prefs);

        NotificationPreference loaded = preferenceRepository.findById(userId);
        assertNotNull(loaded);
        assertEquals(userId, loaded.userId);
        assertFalse(loaded.emailEnabled);
        assertFalse(loaded.emailOnAnnouncement);
        assertTrue(loaded.emailOnEventUpdate);
        assertFalse(loaded.emailOnEventCancellation);
        assertTrue(loaded.emailOnRegistrationConfirmed);
        assertFalse(loaded.emailOnFreeSlot);
        assertEquals(6, loaded.reminderLeadTimeHours);
    }

    @Test
    @Transactional
    void persistAndLoad_defaultsAreStored() {
        UUID userId = UUID.randomUUID();
        NotificationPreference prefs = new NotificationPreference();
        prefs.userId = userId;

        preferenceRepository.persist(prefs);

        NotificationPreference loaded = preferenceRepository.findById(userId);
        assertNotNull(loaded);
        assertTrue(loaded.emailEnabled);
        assertTrue(loaded.emailOnAnnouncement);
        assertTrue(loaded.emailOnEventUpdate);
        assertTrue(loaded.emailOnEventCancellation);
        assertTrue(loaded.emailOnRegistrationConfirmed);
        assertTrue(loaded.emailOnFreeSlot);
        assertEquals(24, loaded.reminderLeadTimeHours);
    }
}
