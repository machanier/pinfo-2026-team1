package ch.unige.pinfo.event.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import ch.unige.pinfo.event.openapi.model.AnnouncementStatus;
import org.hibernate.annotations.Check;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "announcements")
@Check(constraints = "status IN ('PENDING_MODERATION', 'PUBLISHED', 'REJECTED')")
public class Announcement extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID announcementId;

    @Column(nullable = false)
    public UUID eventId;

    @Column(nullable = false)
    public UUID organizerId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    public AnnouncementStatus status;

    // postedAt is stored as NOT NULL in the DB (Hibernate created it that way).
    // For PENDING_MODERATION it stores the submission time; publishAnnouncement()
    // will overwrite it with the real publication timestamp when the moderation
    // decision comes back. Public-facing API only exposes PUBLISHED announcements,
    // so end-users always see the actual publication time.
    @Column(nullable = false)
    public OffsetDateTime postedAt;

    @Column(nullable = false, length = 2000)
    public String body;

    // Always set postedAt on first persist to satisfy the NOT NULL constraint.
    // For PENDING_MODERATION this records the submission time.
    // For PUBLISHED (direct insert) it records the publication time.
    @PrePersist
    public void savePostingTime() {
        if (postedAt == null) {
            this.postedAt = OffsetDateTime.now();
        }
    }

}
