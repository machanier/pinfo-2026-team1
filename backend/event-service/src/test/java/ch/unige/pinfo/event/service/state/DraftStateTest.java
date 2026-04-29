package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class DraftStateTest {

    private DraftState draftState;
    private Event event;

    @BeforeEach
    void setUp() {
        draftState = new DraftState();
        event = new Event();
        event.eventId = UUID.randomUUID();
        event.organizerId = UUID.randomUUID();
        event.status = EventStatus.DRAFT;
        event.title = "Test Event";
    }

    @Test
    void getStatusReturnsDraft() {
        assertEquals(EventStatus.DRAFT, draftState.getStatus());
    }

    @Test
    void canPublishReturnsTrue() {
        assertTrue(draftState.canPublish());
    }

    @Test
    void canCancelReturnsFalse() {
        assertFalse(draftState.canCancel());
    }

    @Test
    void applyTransitionToDraftThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> draftState.applyTransition(event, EventStatus.DRAFT));

        assertTrue(exception.getMessage().contains("DRAFT to DRAFT"));
    }

    @Test
    void applyTransitionToCancelledThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> draftState.applyTransition(event, EventStatus.CANCELLED));

        assertTrue(exception.getMessage().contains("Cannot transition from DRAFT to CANCELLED"));
    }

    @Test
    void applyTransitionToPublishedSucceeds() {
        OffsetDateTime beforeTransition = OffsetDateTime.now();

        draftState.applyTransition(event, EventStatus.PUBLISHED);

        assertEquals(EventStatus.PUBLISHED, event.status);
        assertNotNull(event.updatedAt);
        assertTrue(event.updatedAt.isAfter(beforeTransition.minusSeconds(1)));
    }

    @Test
    void applyTransitionToPublishedUpdatesTimestamp() {
        OffsetDateTime originalTime = OffsetDateTime.now().minusHours(1);
        event.updatedAt = originalTime;

        draftState.applyTransition(event, EventStatus.PUBLISHED);

        assertTrue(event.updatedAt.isAfter(originalTime));
    }

    @Test
    void applyTransitionToPublishedPreservesOtherFields() {
        UUID expectedOrganizerId = event.organizerId;
        String expectedTitle = event.title;

        draftState.applyTransition(event, EventStatus.PUBLISHED);

        assertEquals(expectedOrganizerId, event.organizerId);
        assertEquals(expectedTitle, event.title);
    }
}
