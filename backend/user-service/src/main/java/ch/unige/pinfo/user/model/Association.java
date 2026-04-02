package ch.unige.pinfo.user.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Association extends User {
    @Column(nullable = false)
    public String description;

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}