package ch.unige.pinfo.registration.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public class EligibilityAttributesDTO {
    private UUID userId;
    private String faculty;
    private String major;
    private String degreeLevel;

    public EligibilityAttributesDTO() {
    } // Indispensable pour Jackson

    public EligibilityAttributesDTO(UUID userId, String faculty, String major, String degreeLevel) {
        this.userId = userId;
        this.faculty = faculty;
        this.major = major;
        this.degreeLevel = degreeLevel;
    }

    // Getters
    public UUID getUserId() {
        return userId;
    }

    public String getFaculty() {
        return faculty;
    }

    public String getMajor() {
        return major;
    }

    public String getDegreeLevel() {
        return degreeLevel;
    }
}