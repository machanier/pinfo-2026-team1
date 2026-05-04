package ch.unige.pinfo.moderation.model;

import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ModerationCaseTest {

    private ModerationCase moderationCase;

    @BeforeEach
    void setUp() {
        moderationCase = new ModerationCase();
    }

    @Test
    void testDefaultValuesAreNullOrEmpty() {
        assertNull(moderationCase.caseId);
        assertNull(moderationCase.eventId);
        assertNull(moderationCase.eventTitle);
        assertNull(moderationCase.organizerId);
        assertNull(moderationCase.status);
        assertNotNull(moderationCase.flags);
        assertTrue(moderationCase.flags.isEmpty());
        assertNull(moderationCase.adminNote);
        assertNull(moderationCase.rejectionReason);
        assertNull(moderationCase.createdAt);
        assertNull(moderationCase.decidedAt);
    }

    @Test
    void testSetAndGetBasicFields() {
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        moderationCase.eventId = eventId;
        moderationCase.eventTitle = "Test Event";
        moderationCase.organizerId = organizerId;
        moderationCase.status = ModerationStatus.PENDING;
        moderationCase.adminNote = "Needs review";
        moderationCase.rejectionReason = "Contains prohibited content";

        assertEquals(eventId, moderationCase.eventId);
        assertEquals("Test Event", moderationCase.eventTitle);
        assertEquals(organizerId, moderationCase.organizerId);
        assertEquals(ModerationStatus.PENDING, moderationCase.status);
        assertEquals("Needs review", moderationCase.adminNote);
        assertEquals("Contains prohibited content", moderationCase.rejectionReason);
    }

    @Test
    void testFlagsAndTimestamps() {
        ModerationFlag f = new ModerationFlag("title", "inappropriate", 0.92f);
        moderationCase.flags.add(f);

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime decided = now.plusDays(1);
        moderationCase.createdAt = now;
        moderationCase.decidedAt = decided;

        assertEquals(1, moderationCase.flags.size());
        ModerationFlag stored = moderationCase.flags.get(0);
        assertEquals("title", stored.field);
        assertEquals("inappropriate", stored.reason);
        assertEquals(0.92f, stored.confidence);

        assertEquals(now, moderationCase.createdAt);
        assertEquals(decided, moderationCase.decidedAt);
    }
}
