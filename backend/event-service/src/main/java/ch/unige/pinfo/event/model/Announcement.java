package ch.unige.pinfo.event.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import ch.unige.pinfo.event.openapi.model.AnnouncementStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "announcements")
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

    @Column
    public OffsetDateTime postedAt;

    @Column(nullable = false, length = 2000)
    public String body;

    // Save the current time when creating a new announcement before persisting in
    // the database
    @PrePersist
    public void savePostingTime() {
        if (status == AnnouncementStatus.PUBLISHED && postedAt == null) {
            this.postedAt = OffsetDateTime.now();
        }
    }

}
