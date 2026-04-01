package ch.unige.pinfo.user.model;

import jakarta.persistence.Entity;

@Entity
public class Association extends User {
    public String description;
    public Boolean verified;
}