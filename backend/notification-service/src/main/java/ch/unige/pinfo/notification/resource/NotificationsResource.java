package ch.unige.pinfo.notification.resource;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import ch.unige.pinfo.notification.openapi.api.NotificationsApi;
import ch.unige.pinfo.notification.openapi.model.ApiNotificationsUnreadCountGet200Response;
import ch.unige.pinfo.notification.openapi.model.NotificationPage;
import ch.unige.pinfo.notification.openapi.model.NotificationResponse;
import ch.unige.pinfo.notification.openapi.model.NotificationType;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import java.util.Map;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class NotificationsResource implements NotificationsApi {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 30;

    @Inject
    NotificationRepository notificationRepository;

    @Inject
    JsonWebToken jwt;

    @Override
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public NotificationPage apiNotificationsGet(Boolean read, NotificationType type, Integer page, Integer size) {
        UUID userId = getUserIdFromJwt();
        int pageValue = normalizePage(page);
        int sizeValue = normalizeSize(size);
        ch.unige.pinfo.notification.model.NotificationType internalType = mapType(type);

        List<Notification> notifications = notificationRepository.findPage(userId, read, internalType, pageValue,
                sizeValue);
        long totalElementsLong = notificationRepository.countByFilter(userId, read, internalType);
        long unreadCountLong = notificationRepository.countUnread(userId);
        int totalElements = Math.toIntExact(totalElementsLong);
        int unreadCount = Math.toIntExact(unreadCountLong);
        int totalPages = (int) Math.ceil((double) totalElements / sizeValue);
        List<NotificationResponse> content = notifications.stream()
                .map(this::toApi)
                .toList();

        return new NotificationPage()
                .content(content)
                .page(pageValue)
                .size(sizeValue)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .unreadCount(unreadCount);
    }

    @Override
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public ApiNotificationsUnreadCountGet200Response apiNotificationsUnreadCountGet() {
        UUID userId = getUserIdFromJwt();
        long unreadCountLong = notificationRepository.countUnread(userId);
        int unreadCount = Math.toIntExact(unreadCountLong);
        return new ApiNotificationsUnreadCountGet200Response().count(unreadCount);
    }

    @Override
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public NotificationResponse apiNotificationsNotificationIdReadPatch(UUID notificationId) {
        if (notificationId == null) {
            throw new BadRequestException("notificationId is required");
        }

        UUID userId = getUserIdFromJwt();
        Notification notification = notificationRepository.findById(notificationId);
        if (notification == null) {
            throw new NotFoundException("Notification not found");
        }
        if (!notification.userId.equals(userId)) {
            throw new ForbiddenException("Not your notification");
        }

        notification.read = true;
        notificationRepository.persist(notification);
        return toApi(notification);
    }

    @Override
    @Transactional
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    public void apiNotificationsReadAllPatch() {
        UUID userId = getUserIdFromJwt();
        notificationRepository.update("read = true where userId = :userId and read = false",
                Map.of("userId", userId));
    }

    private int normalizePage(Integer page) {
        if (page == null || page < 0) {
            return DEFAULT_PAGE;
        }
        return page;
    }

    private int normalizeSize(Integer size) {
        if (size == null || size <= 0) {
            return DEFAULT_SIZE;
        }
        return size;
    }

    private ch.unige.pinfo.notification.model.NotificationType mapType(NotificationType type) {
        if (type == null) {
            return null;
        }
        return ch.unige.pinfo.notification.model.NotificationType.valueOf(type.name());
    }

    private NotificationResponse toApi(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setNotificationId(notification.notificationId);
        response.setUserId(notification.userId);
        if (notification.type != null) {
            response.setType(NotificationType.valueOf(notification.type.name()));
        }
        response.setEventId(notification.eventId);
        response.setBody(notification.body);
        response.setRead(notification.read);
        response.setCreatedAt(notification.createdAt);
        return response;
    }

    private UUID getUserIdFromJwt() {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new NotAuthorizedException(Response.status(Response.Status.UNAUTHORIZED)
                    .entity("JWT subject claim is missing or invalid")
                    .build());
        }

        return UUID.nameUUIDFromBytes(subject.getBytes(StandardCharsets.UTF_8));
    }
}
