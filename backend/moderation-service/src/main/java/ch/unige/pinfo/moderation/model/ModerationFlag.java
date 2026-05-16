package ch.unige.pinfo.moderation.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ModerationFlag {

    @Column(nullable = false)
    public String field;

    @Column(nullable = false)
    public String reason;

    @Column(nullable = false)
    public float confidence;

    public ModerationFlag() {
    }

    public ModerationFlag(String field, String reason, float confidence) {
        this.field = field;
        this.reason = reason;
        this.confidence = confidence;
    }
}
