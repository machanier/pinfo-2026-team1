package ch.unige.pinfo.event.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.util.UUID;

/**
 * Projection that tracks the number of confirmed registrations per event.
 * Updated by {@link ch.unige.pinfo.event.messaging.RegistrationEventConsumer}
 * when registration.confirmed / registration.cancelled Kafka messages arrive.
 */
@Entity
@Table(name = "event_registration_counts")
public class EventRegistrationCount extends PanacheEntityBase {

    @Id
    public UUID eventId;

    @Column(nullable = false)
    public int registeredCount = 0;
}
