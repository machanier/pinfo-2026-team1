package ch.unige.pinfo.registration;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Registration extends PanacheEntity {
    public Long userId;
    public Long eventId;
    public String status;
}
