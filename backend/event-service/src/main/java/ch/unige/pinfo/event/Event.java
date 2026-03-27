package ch.unige.pinfo.event;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Event extends PanacheEntity {
    public String title;
    public String description;
    public String location;
}
