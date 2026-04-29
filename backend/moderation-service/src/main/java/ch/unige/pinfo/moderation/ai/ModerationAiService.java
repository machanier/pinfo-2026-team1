package ch.unige.pinfo.moderation.ai;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface ModerationAiService {

    @SystemMessage("""
            You are a content moderation assistant for a university event platform.
            You screen event posts for inappropriate content.
            You must respond with ONLY valid JSON, no explanation, no markdown.
            Screen for: hate speech, harassment, explicit content, spam, dangerous activities.
            """)
    @UserMessage("""
            Screen this event:
            Title: {title}
            Description: {description}

            Respond with ONLY this JSON object:
            {
              "approved": true or false,
              "reason": "one sentence explanation",
              "severity": "NONE or LOW or MEDIUM or HIGH",
              "confidence": 0.0 to 1.0
            }
            """)
    String moderateEvent(String title, String description);
}