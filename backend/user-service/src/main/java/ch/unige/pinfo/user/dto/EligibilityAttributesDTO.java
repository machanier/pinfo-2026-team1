package ch.unige.pinfo.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public class EligibilityAttributesDTO {

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("faculty")
    private String faculty;

    @JsonProperty("major")
    private String major;

    @JsonProperty("degreeLevel")
    private String degreeLevel;

    public EligibilityAttributesDTO() {
    }

    public EligibilityAttributesDTO(UUID userId, String faculty, String major, String degreeLevel) {
        this.userId = userId;
        this.faculty = faculty;
        this.major = major;
        this.degreeLevel = degreeLevel;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getFaculty() {
        return faculty;
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public String getDegreeLevel() {
        return degreeLevel;
    }

    public void setDegreeLevel(String degreeLevel) {
        this.degreeLevel = degreeLevel;
    }
}