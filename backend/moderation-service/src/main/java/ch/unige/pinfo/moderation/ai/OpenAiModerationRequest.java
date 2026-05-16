package ch.unige.pinfo.moderation.ai;

import java.util.List;

public class OpenAiModerationRequest {
    public List<String> input;

    public OpenAiModerationRequest(String text) {
        this.input = List.of(text);
    }
}