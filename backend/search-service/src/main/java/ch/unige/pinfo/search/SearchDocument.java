package ch.unige.pinfo.search;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class SearchDocument extends PanacheEntity {
    public String type;
    public String content;
}
