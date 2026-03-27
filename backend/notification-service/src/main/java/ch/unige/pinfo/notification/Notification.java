package ch.unige.pinfo.notification;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Notification extends PanacheEntity {
    public Long userId;
    public String channel;
    public String message;
}
