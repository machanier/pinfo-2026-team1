/*
 * package ch.unige.pinfo.moderation.ai;
 * 
 * //import io.quarkiverse.langchain4j.moderation.Moderate;
 * import io.quarkiverse.langchain4j.RegisterAiService;
 * import dev.langchain4j.model.moderation.Moderation;
 * import dev.langchain4j.service.UserMessage;
 * 
 * @RegisterAiService
 * public interface ModerationAiService {
 * 
 * @UserMessage("""
 * Screen this event:
 * Title: {title}
 * Description: {description}
 * 
 * Respond with ONLY this JSON object:
 * {
 * "approved": true or false,
 * "reason": "one sentence explanation",
 * "severity": "NONE or LOW or MEDIUM or HIGH",
 * "confidence": 0.0 to 1.0
 * }
 * """)
 * String moderateEvent(String title, String description);
 * }
 */