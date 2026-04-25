package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CancelledStateTest {

    private CancelledState cancelledState;
    private Event event;

    @BeforeEach
    void setUp() {
        cancelledState = new CancelledState();
        event = new Event();
        event.eventId = UUID.randomUUID();
        event.organizerId = UUID.randomUUID();
        event.status = EventStatus.CANCELLED;
        event.title = "Test Event";
    }

    @Test
    void getStatusReturnsCancelled() {
        assertEquals(EventStatus.CANCELLED, cancelledState.getStatus());
    }

    @Test
    void canPublishReturnsFalse() {
        assertFalse(cancelledState.canPublish());
    }

    @Test
    void canCancelReturnsFalse() {
        assertFalse(cancelledState.canCancel());
    }

    @Test
    void applyTransitionToDraftThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> cancelledState.applyTransition(event, EventStatus.DRAFT));

        assertTrue(exception.getMessage().contains("CANCELLED is a terminal state"));
    }

    @Test
    void applyTransitionToPublishedThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> cancelledState.applyTransition(event, EventStatus.PUBLISHED));

        assertTrue(exception.getMessage().contains("CANCELLED is a terminal state"));
    }

    @Test
    void applyTransitionToCancelledThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> cancelledState.applyTransition(event, EventStatus.CANCELLED));

        assertTrue(exception.getMessage().contains("CANCELLED is a terminal state"));
    }

    @Test
    void eventStatusRemainsUnchangedAfterFailedTransition() {
        EventStatus originalStatus = event.status;

        assertThrows(
                IllegalStateException.class,
                () -> cancelledState.applyTransition(event, EventStatus.DRAFT));

        assertEquals(originalStatus, event.status);
    }
}
