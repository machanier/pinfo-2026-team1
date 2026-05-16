package ch.unige.pinfo.moderation.model;

import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ModerationCaseTest {

    @Test
    void defaultConstructor_initializesFlagsList() {
        ModerationCase moderationCase = new ModerationCase();

        assertNotNull(moderationCase.flags);
        assertTrue(moderationCase.flags.isEmpty());
    }

    @Test
    void fields_canBeAssignedAndRead() {
        ModerationCase moderationCase = new ModerationCase();
        UUID caseId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UUID organizerId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now();
        OffsetDateTime decidedAt = createdAt.plusHours(1);

        moderationCase.caseId = caseId;
        moderationCase.eventId = eventId;
        moderationCase.organizerId = organizerId;
        moderationCase.title = "Test Title";
        moderationCase.status = ModerationStatus.PENDING;
        moderationCase.adminNote = "Admin note";
        moderationCase.rejectionReason = "Reason";
        moderationCase.createdAt = createdAt;
        moderationCase.decidedAt = decidedAt;

        assertEquals(caseId, moderationCase.caseId);
        assertEquals(eventId, moderationCase.eventId);
        assertEquals(organizerId, moderationCase.organizerId);
        assertEquals("Test Title", moderationCase.title);
        assertEquals(ModerationStatus.PENDING, moderationCase.status);
        assertEquals("Admin note", moderationCase.adminNote);
        assertEquals("Reason", moderationCase.rejectionReason);
        assertEquals(createdAt, moderationCase.createdAt);
        assertEquals(decidedAt, moderationCase.decidedAt);
    }

    @Test
    void flags_canBeAdded() {
        ModerationCase moderationCase = new ModerationCase();
        ModerationFlag flag = new ModerationFlag("content", "Spam", 0.5f);

        moderationCase.flags.add(flag);

        assertEquals(1, moderationCase.flags.size());
        assertEquals(flag, moderationCase.flags.get(0));
    }
}
