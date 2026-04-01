package ch.unige.pinfo.user.model;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Entity
public class Student extends User {
    public String faculty;
    public String major;

    @Enumerated(EnumType.STRING)
    public DegreeLevel degreeLevel;
}