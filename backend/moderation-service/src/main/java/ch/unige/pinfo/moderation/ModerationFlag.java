package ch.unige.pinfo.moderation;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class ModerationFlag extends PanacheEntity {
    public String targetType;
    public Long targetId;
    public String reason;
    public String status;
}
