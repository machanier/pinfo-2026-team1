package ch.unige.pinfo.notification.repository;

import ch.unige.pinfo.notification.model.NotificationPreference;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class NotificationPreferenceRepositoryTest {

    @Inject
    NotificationPreferenceRepository preferenceRepository;

    @Test
    @TestTransaction
    void persistAndFindById_returnsDefaults() {
        UUID userId = UUID.randomUUID();

        NotificationPreference preference = new NotificationPreference();
        preference.userId = userId;

        preferenceRepository.persist(preference);
        preferenceRepository.flush();

        NotificationPreference stored = preferenceRepository.findById(userId);

        assertNotNull(stored);
        assertTrue(stored.emailEnabled);
        assertTrue(stored.emailOnAnnouncement);
        assertTrue(stored.emailOnEventUpdate);
        assertTrue(stored.emailOnEventCancellation);
        assertTrue(stored.emailOnRegistrationConfirmed);
        assertTrue(stored.emailOnFreeSlot);
        assertEquals(24, stored.reminderLeadTimeHours);
    }

    @Test
    @TestTransaction
    void updatePreferencePersistsChanges() {
        UUID userId = UUID.randomUUID();

        NotificationPreference preference = new NotificationPreference();
        preference.userId = userId;
        preferenceRepository.persist(preference);
        preferenceRepository.flush();

        NotificationPreference stored = preferenceRepository.findById(userId);
        stored.emailEnabled = false;
        stored.reminderLeadTimeHours = 12;
        preferenceRepository.flush();

        NotificationPreference updated = preferenceRepository.findById(userId);

        assertNotNull(updated);
        assertEquals(false, updated.emailEnabled);
        assertEquals(12, updated.reminderLeadTimeHours);
    }
}
