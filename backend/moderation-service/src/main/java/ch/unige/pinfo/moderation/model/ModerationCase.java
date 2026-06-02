package ch.unige.pinfo.moderation.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;

@Entity
@Table(name = "moderation_cases")
public class ModerationCase extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID caseId;

    @Column(nullable = false)
    public UUID eventId;

    @Column
    public UUID announcementId;

    @Column(nullable = false)
    public String title;

    @Column(nullable = false)
    public UUID organizerId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    public ModerationStatus status;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "moderation_case_flags", joinColumns = @JoinColumn(name = "case_id"))
    public List<ModerationFlag> flags = new ArrayList<>();

    public String adminNote;

    public String rejectionReason;

    // SHA-256 of the screened text (title + description). Lets the event.updated
    // re-screen path skip a redundant screening when the content is unchanged (e.g.
    // the auto-approve → PUBLISHED transition re-emits event.updated without an edit).
    @Column(length = 64)
    public String contentHash;

    @Column(nullable = false)
    public OffsetDateTime createdAt;

    public OffsetDateTime decidedAt;
}
