package ch.unige.pinfo.registration.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;

@Entity
@Table(name = "registrations", uniqueConstraints = {
        @UniqueConstraint(name = "uc_student_event", columnNames = { "studentId", "eventId" })
}, indexes = { @Index(name = "idx_event_status", columnList = "eventId , status") })
public class Registration extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID registrationId;

    public UUID getRegistrationId() {
        return registrationId;
    }

    public void setRegistrationId(UUID registrationId) {
        this.registrationId = registrationId;
    }

    private String studentId;

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    private UUID eventId;

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    private RegistrationStatus status;

    public RegistrationStatus getStatus() {
        return status;
    }

    public void setStatus(RegistrationStatus status) {
        this.status = status;
    }

    private OffsetDateTime registeredAt;

    public OffsetDateTime getDate() {
        return registeredAt;
    }

    public void setDate(OffsetDateTime date) {
        this.registeredAt = date;
    }

    private Integer waitlistPosition;

    public Integer getPos() {
        return waitlistPosition;
    }

    public void setPos(Integer pos) {
        this.waitlistPosition = pos;
    }

}
