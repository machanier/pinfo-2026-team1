package ch.unige.pinfo.notification.repository;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class NotificationRepositoryTest {

    @Inject
    NotificationRepository notificationRepository;

    @Test
    @TestTransaction
    void findPage_filtersByReadAndType() {
        UUID userId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        Notification match = buildNotification(userId, NotificationType.ANNOUNCEMENT, false);
        Notification readMatch = buildNotification(userId, NotificationType.ANNOUNCEMENT, true);
        Notification wrongType = buildNotification(userId, NotificationType.EVENT_CANCELLED, false);
        Notification otherUser = buildNotification(otherUserId, NotificationType.ANNOUNCEMENT, false);

        notificationRepository.persist(match);
        notificationRepository.persist(readMatch);
        notificationRepository.persist(wrongType);
        notificationRepository.persist(otherUser);
        notificationRepository.flush();

        List<Notification> results = notificationRepository.findPage(userId, false, NotificationType.ANNOUNCEMENT, 0,
                10);

        assertEquals(1, results.size());
        assertEquals(match.notificationId, results.get(0).notificationId);
    }

    @Test
    @TestTransaction
    void findPage_paginatesResults() {
        UUID userId = UUID.randomUUID();

        Notification first = buildNotification(userId, NotificationType.REMINDER, false);
        Notification second = buildNotification(userId, NotificationType.REMINDER, false);
        Notification third = buildNotification(userId, NotificationType.REMINDER, false);

        notificationRepository.persist(first);
        notificationRepository.persist(second);
        notificationRepository.persist(third);
        notificationRepository.flush();

        List<Notification> page0 = notificationRepository.findPage(userId, null, null, 0, 2);
        List<Notification> page1 = notificationRepository.findPage(userId, null, null, 1, 2);

        assertEquals(2, page0.size());
        assertEquals(1, page1.size());
        assertTrue(page0.stream().allMatch(notification -> userId.equals(notification.userId)));
        assertTrue(page1.stream().allMatch(notification -> userId.equals(notification.userId)));
    }

    @Test
    @TestTransaction
    void countByFilter_matchesFilters() {
        UUID userId = UUID.randomUUID();

        notificationRepository.persist(buildNotification(userId, NotificationType.EVENT_UPDATED, true));
        notificationRepository.persist(buildNotification(userId, NotificationType.EVENT_UPDATED, false));
        notificationRepository.persist(buildNotification(userId, NotificationType.EVENT_CANCELLED, false));
        notificationRepository.flush();

        long readEventUpdated = notificationRepository.countByFilter(userId, true, NotificationType.EVENT_UPDATED);
        long unreadAny = notificationRepository.countByFilter(userId, false, null);
        long anyEventCancelled = notificationRepository.countByFilter(userId, null, NotificationType.EVENT_CANCELLED);

        assertEquals(1, readEventUpdated);
        assertEquals(2, unreadAny);
        assertEquals(1, anyEventCancelled);
    }

    @Test
    @TestTransaction
    void countUnread_countsOnlyUnread() {
        UUID userId = UUID.randomUUID();

        notificationRepository.persist(buildNotification(userId, NotificationType.REGISTRATION_CONFIRMED, false));
        notificationRepository.persist(buildNotification(userId, NotificationType.REGISTRATION_CANCELLED, false));
        notificationRepository.persist(buildNotification(userId, NotificationType.REGISTRATION_CANCELLED, true));
        notificationRepository.flush();

        long unreadCount = notificationRepository.countUnread(userId);

        assertEquals(2, unreadCount);
    }

    private Notification buildNotification(UUID userId, NotificationType type, boolean read) {
        Notification notification = new Notification();
        notification.notificationId = UUID.randomUUID();
        notification.userId = userId;
        notification.type = type;
        notification.eventId = UUID.randomUUID();
        notification.body = "Test";
        notification.read = read;
        notification.createdAt = OffsetDateTime.now();
        return notification;
    }
}
