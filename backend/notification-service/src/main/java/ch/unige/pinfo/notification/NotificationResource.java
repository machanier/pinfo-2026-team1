package ch.unige.pinfo.notification;

import ch.unige.pinfo.notification.openapi.api.NotificationsApi;
import ch.unige.pinfo.notification.openapi.model.ApiNotificationsUnreadCountGet200Response;
import ch.unige.pinfo.notification.openapi.model.NotificationPage;
import ch.unige.pinfo.notification.openapi.model.NotificationResponse;
import ch.unige.pinfo.notification.openapi.model.NotificationType;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Path("/api/notifications")
public class NotificationResource implements NotificationsApi {

    static final Set<Long> READ_NOTIFICATION_IDS = new HashSet<>();

    @Override
    public NotificationPage apiNotificationsGet(Boolean read, NotificationType type, Integer page, Integer size) {
        @SuppressWarnings("unchecked")
        List<Notification> rows = (List<Notification>) (List<?>) Notification.listAll();
        var content = new ArrayList<NotificationResponse>();
        for (Notification row : rows) {
            NotificationResponse response = toResponse(row);
            if (read == null || read.equals(response.getRead())) {
                content.add(response);
            }
        }

        int unreadCount = (int) rows.stream().filter(n -> !READ_NOTIFICATION_IDS.contains(n.id)).count();
        return new NotificationPage()
                .content(content)
                .page(page == null ? 0 : page)
                .size(size == null ? content.size() : size)
                .totalElements(content.size())
                .totalPages(1)
                .unreadCount(unreadCount);
    }

    @Override
    @Transactional
    public NotificationResponse apiNotificationsNotificationIdReadPatch(UUID notificationId) {
        Notification notification = Notification.findById(toLongId(notificationId));
        if (notification == null) {
            throw new NotFoundException();
        }
        READ_NOTIFICATION_IDS.add(notification.id);
        return toResponse(notification);
    }

    @Override
    @Transactional
    public void apiNotificationsReadAllPatch() {
        @SuppressWarnings("unchecked")
        List<Notification> rows = (List<Notification>) (List<?>) Notification.listAll();
        for (Notification row : rows) {
            READ_NOTIFICATION_IDS.add(row.id);
        }
    }

    @Override
    public ApiNotificationsUnreadCountGet200Response apiNotificationsUnreadCountGet() {
        @SuppressWarnings("unchecked")
        List<Notification> rows = (List<Notification>) (List<?>) Notification.listAll();
        int unreadCount = (int) rows.stream().filter(n -> !READ_NOTIFICATION_IDS.contains(n.id))
                .count();
        return new ApiNotificationsUnreadCountGet200Response().count(unreadCount);
    }

    static NotificationResponse toResponse(Notification row) {
        return new NotificationResponse()
                .notificationId(toUuid(row.id))
                .userId(toUuid(row.userId == null ? 0L : row.userId))
                .eventId(null)
                .body(row.message)
                .type(NotificationType.ANNOUNCEMENT)
                .read(READ_NOTIFICATION_IDS.contains(row.id))
                .createdAt(OffsetDateTime.now());
    }

    static long toLongId(UUID id) {
        return id.getLeastSignificantBits() & Long.MAX_VALUE;
    }

    static UUID toUuid(long id) {
        return new UUID(0L, id);
    }

    @Transactional
    public Notification createSeed(Notification payload) {
        payload.persist();
        return payload;
    }

    @Deprecated
    @Transactional
    public Notification create(Notification payload) {
        return createSeed(payload);
    }
}
