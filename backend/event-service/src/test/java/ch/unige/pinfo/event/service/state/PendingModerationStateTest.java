package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PendingModerationStateTest {

    private PendingModerationState pendingModerationState;
    private Event event;

    @BeforeEach
    void setUp() {
        pendingModerationState = new PendingModerationState();
        event = new Event();
        event.eventId = UUID.randomUUID();
        event.organizerId = UUID.randomUUID();
        event.status = EventStatus.PENDING_MODERATION;
        event.title = "Test Event";
    }

    @Test
    void getStatusReturnsPendingModeration() {
        assertEquals(EventStatus.PENDING_MODERATION, pendingModerationState.getStatus());
    }

    @Test
    void canPublishReturnsTrue() {
        assertTrue(pendingModerationState.canPublish());
    }

    @Test
    void canCancelReturnsFalse() {
        assertFalse(pendingModerationState.canCancel());
    }

    @Test
    void applyTransitionToPendingModerationThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> pendingModerationState.applyTransition(event, EventStatus.PENDING_MODERATION));

        assertTrue(exception.getMessage().contains("Cannot transition from PENDING_MODERATION to PENDING_MODERATION"));
    }

    @Test
    void applyTransitionToCancelledThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> pendingModerationState.applyTransition(event, EventStatus.CANCELLED));

        assertTrue(exception.getMessage().contains("Cannot transition from PENDING_MODERATION to CANCELLED"));
    }

    @Test
    void applyTransitionToDraftSucceeds() {
        OffsetDateTime beforeTransition = OffsetDateTime.now();

        pendingModerationState.applyTransition(event, EventStatus.DRAFT);

        assertEquals(EventStatus.DRAFT, event.status);
        assertNotNull(event.updatedAt);
        assertTrue(event.updatedAt.isAfter(beforeTransition.minusSeconds(1)));
    }

    @Test
    void applyTransitionToPublishedSucceeds() {
        OffsetDateTime beforeTransition = OffsetDateTime.now();

        pendingModerationState.applyTransition(event, EventStatus.PUBLISHED);

        assertEquals(EventStatus.PUBLISHED, event.status);
        assertNotNull(event.updatedAt);
        assertTrue(event.updatedAt.isAfter(beforeTransition.minusSeconds(1)));
    }
}