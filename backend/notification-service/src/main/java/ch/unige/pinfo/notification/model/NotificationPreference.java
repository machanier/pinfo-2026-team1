package ch.unige.pinfo.notification.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "notification_preferences")
public class NotificationPreference extends PanacheEntityBase {

    @Id
    @Column(nullable = false)
    public UUID userId;

    @Column(nullable = false)
    public boolean emailEnabled = true;

    @Column(nullable = false)
    public boolean emailOnAnnouncement = true;

    @Column(nullable = false)
    public boolean emailOnEventUpdate = true;

    @Column(nullable = false)
    public boolean emailOnEventCancellation = true;

    @Column(nullable = false)
    public boolean emailOnRegistrationCancelled = true;

    @Column(nullable = false)
    public boolean emailOnWaitlistPromoted = true;

    @Column(nullable = false)
    public boolean emailOnRegistrationConfirmed = true;

    @Column(nullable = false)
    public boolean emailOnFreeSlot = true;

    @Column(nullable = false)
    public boolean emailOnReminder = true;

    @Column(nullable = false)
    public int reminderLeadTimeHours = 24;
}
