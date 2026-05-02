package ch.unige.pinfo.moderation.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class OpenAiModerationResponse {

    public List<ModerationResult> results;

    public static class ModerationResult {
        public boolean flagged;
        public Categories categories;

        @JsonProperty("category_scores")
        public CategoryScores categoryScores;
    }

    public static class Categories {
        public boolean hate;
        public boolean harassment;
        public boolean violence;

        @JsonProperty("sexual/minors")
        public boolean sexualMinors;

        @JsonProperty("self-harm")
        public boolean selfHarm;
    }

    public static class CategoryScores {
        public float hate;
        public float harassment;
        public float violence;

        @JsonProperty("self-harm")
        public float selfHarm;
    }
}