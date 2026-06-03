package ch.unige.pinfo.notification.repository;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.model.NotificationType;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class NotificationRepository implements PanacheRepositoryBase<Notification, UUID> {

    public List<Notification> findPage(UUID userId, Boolean read, NotificationType type, int page, int size) {
        String query = buildQuery(read, type);
        Map<String, Object> params = buildParams(userId, read, type);
        return find(query, params)
                .page(Page.of(page, size))
                .list();
    }

    public long countByFilter(UUID userId, Boolean read, NotificationType type) {
        String query = buildQuery(read, type);
        Map<String, Object> params = buildParams(userId, read, type);
        return count(query, params);
    }

    public long countUnread(UUID userId) {
        return count("userId = :userId and read = false", Map.of("userId", userId));
    }

    // Checks if a reminder notification already exists for that user + event, so the reminder scheduler does not create duplicates on each run 
    public boolean existsByUserEventType(UUID userId, UUID eventId, NotificationType type) {
        return count("userId = :userId and eventId = :eventId and type = :type",
                Map.of("userId", userId, "eventId", eventId, "type", type)) > 0;
    }

    private String buildQuery(Boolean read, NotificationType type) {
        StringBuilder query = new StringBuilder("userId = :userId");
        if (read != null) {
            query.append(" and read = :read");
        }
        if (type != null) {
            query.append(" and type = :type");
        }
        return query.toString();
    }

    private Map<String, Object> buildParams(UUID userId, Boolean read, NotificationType type) {
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        if (read != null) {
            params.put("read", read);
        }
        if (type != null) {
            params.put("type", type);
        }
        return params;
    }
}