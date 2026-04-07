package ch.unige.pinfo.event.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "event_registrations", indexes = {
        @Index(name = "idx_event_registrations_event_status", columnList = "event_id, status")
})
public class EventRegistration extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID registrationId;

    @Column(nullable = false)
    private UUID eventId;

    @Column(nullable = false)
    private UUID studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationStatus status;

    public EventRegistration() {
    }

    public EventRegistration(UUID eventId, UUID studentId, RegistrationStatus status) {
        this.eventId = eventId;
        this.studentId = studentId;
        this.status = status;
    }

    public UUID getRegistrationId() {
        return registrationId;
    }

    public UUID getEventId() {
        return eventId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public RegistrationStatus getStatus() {
        return status;
    }

    public void setStatus(RegistrationStatus status) {
        this.status = status;
    }
}