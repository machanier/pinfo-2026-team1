package ch.unige.pinfo.registration.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.ArrayList;
import java.util.List;

public class EligibilityRuleDto {

    @JsonProperty("faculties")
    private List<String> faculties = new ArrayList<>();

    @JsonProperty("majors")
    private List<String> majors = new ArrayList<>();

    public enum DegreeLevelsEnum {
        BACHELOR("BACHELOR"), MASTER("MASTER"), PHD("PHD");

        private String value;

        DegreeLevelsEnum(String v) {
            this.value = v;
        }

        @JsonValue
        public String getValue() {
            return value;
        }

        @JsonCreator
        public static DegreeLevelsEnum fromValue(String value) {
            for (DegreeLevelsEnum b : DegreeLevelsEnum.values()) {
                if (b.value.equals(value))
                    return b;
            }
            throw new IllegalArgumentException("Unexpected value '" + value + "'");
        }
    }

    @JsonProperty("degreeLevels")
    private List<DegreeLevelsEnum> degreeLevels = new ArrayList<>();

    public List<String> getFaculties() {
        return faculties;
    }

    public List<String> getMajors() {
        return majors;
    }

    public List<DegreeLevelsEnum> getDegreeLevels() {
        return degreeLevels;
    }
}