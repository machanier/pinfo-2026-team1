package ch.unige.pinfo.notification.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification extends PanacheEntityBase {

    @Id
    @Column(name = "notification_id", nullable = false)
    public UUID notificationId;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public NotificationType type;

    @Column(name = "event_id")
    public UUID eventId;

    @Column(nullable = false)
    public String body;

    @Column(name = "is_read", nullable = false)
    public boolean read;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;
}
