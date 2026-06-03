package ch.unige.pinfo.notification.repository;

import ch.unige.pinfo.notification.model.NotificationPreference;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@QuarkusTest
class NotificationPreferenceRepositoryTest {

    @Inject
    NotificationPreferenceRepository repository;

    @AfterEach
    @Transactional
    void tearDown() {
        // Clean database state after each test execution to preserve isolation
        repository.deleteAll();
    }

    @Test
    @Transactional
    @DisplayName("Should return the maximum lead time hour value when multiple records exist")
    void testFindMaxReminderLeadTimeHoursWithData() {
        // Given
        NotificationPreference userLow = createPreference(UUID.randomUUID(), 12);
        NotificationPreference userMax = createPreference(UUID.randomUUID(), 72); // The largest value
        NotificationPreference userMid = createPreference(UUID.randomUUID(), 24);

        repository.persist(userLow, userMax, userMid);

        // When
        Integer maxHours = repository.findMaxReminderLeadTimeHours();

        // Then
        assertEquals(72, maxHours, "The query must extract the largest reminderLeadTimeHours value");
    }

    @Test
    @Transactional
    @DisplayName("Should return null gracefully when table contains zero records")
    void testFindMaxReminderLeadTimeHoursEmptyDatabase() {
        // When
        Integer maxHours = repository.findMaxReminderLeadTimeHours();

        // Then
        assertNull(maxHours, "SQL MAX aggregation on an empty table dataset must return null");
    }

    private NotificationPreference createPreference(UUID userId, int leadTimeHours) {
        NotificationPreference preference = new NotificationPreference();
        preference.userId = userId;
        preference.reminderLeadTimeHours = leadTimeHours;
        return preference;
    }
}