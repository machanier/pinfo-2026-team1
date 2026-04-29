package ch.unige.pinfo.moderation.resource;

@ApplicationScoped
public class ModerationService {

    @Inject
    ModerationAiService moderationAiService;

    public ModerationResult moderate(String title, String description) {
        String raw = moderationAiService.moderateEvent(title, description);
        // parse the JSON response
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(raw, ModerationResult.class);
        } catch (Exception e) {
            // if LLM returns malformed JSON, default to manual review
            return ModerationResult.pendingReview("LLM response parsing failed");
        }
    }
}