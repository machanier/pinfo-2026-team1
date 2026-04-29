package ch.unige.pinfo.moderation.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
@SystemMessage("""
                You are a content moderation assistant for a university event platform.
                Your job is to evaluate event descriptions and titles for inappropriate content.
                You must respond with ONLY a JSON object, nothing else.
                Evaluate for: hate speech, harassment, explicit content, spam, or dangerous activities.
                """)
@ApplicationScoped
public interface ModerationAiService {

        // template pour le prompt
        @UserMessage("""
                        Evaluate this event post for inappropriate content:

                        Title: {title}
                        Description: {description}

                        Respond with ONLY this JSON:
                        {
                          "approved": true or false,
                          "reason": "brief explanation",
                          "severity": "NONE, LOW, MEDIUM, HIGH"
                        }
                        """)
        String moderateEvent(String title, String description); // Implémenté automatiquement par LangChain4j
}