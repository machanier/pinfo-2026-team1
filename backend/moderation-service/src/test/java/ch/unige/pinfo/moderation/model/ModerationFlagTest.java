package ch.unige.pinfo.moderation.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ModerationFlagTest {

    @Test
    void defaultConstructor_allowsFieldAssignment() {
        ModerationFlag flag = new ModerationFlag();

        assertNull(flag.field);
        assertNull(flag.reason);
        assertEquals(0.0f, flag.confidence);

        flag.field = "title";
        flag.reason = "Prohibited keyword";
        flag.confidence = 0.75f;

        assertEquals("title", flag.field);
        assertEquals("Prohibited keyword", flag.reason);
        assertEquals(0.75f, flag.confidence);
    }

    @Test
    void constructor_setsFields() {
        ModerationFlag flag = new ModerationFlag("content", "Spam", 0.42f);

        assertEquals("content", flag.field);
        assertEquals("Spam", flag.reason);
        assertEquals(0.42f, flag.confidence);
    }
}
