package ch.unige.pinfo.event.model;

import java.util.ArrayList;
import java.util.List;

public class EligibilityRule {
    public List<String> faculties = new ArrayList<>();
    public List<String> majors = new ArrayList<>();
    public List<String> degreeLevels = new ArrayList<>();

    public EligibilityRule() {
    }

    public EligibilityRule(List<String> faculties, List<String> majors, List<String> degreeLevels) {
        this.faculties = faculties != null ? faculties : new ArrayList<>();
        this.majors = majors != null ? majors : new ArrayList<>();
        this.degreeLevels = degreeLevels != null ? degreeLevels : new ArrayList<>();
    }
}
