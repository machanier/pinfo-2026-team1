package ch.unige.pinfo.event.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class EligibilityRuleDTO {

    @JsonProperty("faculties")
    private List<String> faculties = new ArrayList<>();

    @JsonProperty("majors")
    private List<String> majors = new ArrayList<>();

    @JsonProperty("degreeLevels")
    private List<String> degreeLevels = new ArrayList<>();

    public EligibilityRuleDTO() {
    }

    public List<String> getFaculties() {
        return faculties;
    }

    public void setFaculties(List<String> faculties) {
        this.faculties = faculties;
    }

    public List<String> getMajors() {
        return majors;
    }

    public void setMajors(List<String> majors) {
        this.majors = majors;
    }

    public List<String> getDegreeLevels() {
        return degreeLevels;
    }

    public void setDegreeLevels(List<String> degreeLevels) {
        this.degreeLevels = degreeLevels;
    }
}
