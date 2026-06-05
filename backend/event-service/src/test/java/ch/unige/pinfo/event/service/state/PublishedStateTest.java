package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PublishedStateTest {

    private PublishedState publishedState;
    private Event event;

    @BeforeEach
    void setUp() {
        publishedState = new PublishedState();
        event = new Event();
        event.eventId = UUID.randomUUID();
        event.organizerId = UUID.randomUUID();
        event.status = EventStatus.PUBLISHED;
        event.title = "Test Event";
    }

    @Test
    void getStatusReturnsPublished() {
        assertEquals(EventStatus.PUBLISHED, publishedState.getStatus());
    }

    @Test
    void canPublishReturnsFalse() {
        assertFalse(publishedState.canPublish());
    }

    @Test
    void canCancelReturnsTrue() {
        assertTrue(publishedState.canCancel());
    }

    @Test
    void applyTransitionToDraftThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> publishedState.applyTransition(event, EventStatus.DRAFT));

        assertTrue(exception.getMessage().contains("Cannot transition from PUBLISHED to DRAFT"));
    }

    @Test
    void applyTransitionToPublishedThrows() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> publishedState.applyTransition(event, EventStatus.PUBLISHED));

        assertTrue(exception.getMessage().contains("Cannot transition from PUBLISHED to PUBLISHED"));
    }

    @Test
    void applyTransitionToCancelledSucceeds() {
        OffsetDateTime beforeTransition = OffsetDateTime.now();

        publishedState.applyTransition(event, EventStatus.CANCELLED);

        assertEquals(EventStatus.CANCELLED, event.status);
        assertNotNull(event.updatedAt);
        assertTrue(event.updatedAt.isAfter(beforeTransition.minusSeconds(1)));
    }

    @Test
    void applyTransitionToPendingModerationSucceeds() {
        OffsetDateTime beforeTransition = OffsetDateTime.now();

        publishedState.applyTransition(event, EventStatus.PENDING_MODERATION);

        assertEquals(EventStatus.PENDING_MODERATION, event.status);
        assertNotNull(event.updatedAt);
        assertTrue(event.updatedAt.isAfter(beforeTransition.minusSeconds(1)));
    }

    @Test
    void applyTransitionToCancelledUpdatesTimestamp() {
        OffsetDateTime originalTime = OffsetDateTime.now().minusHours(1);
        event.updatedAt = originalTime;

        publishedState.applyTransition(event, EventStatus.CANCELLED);

        assertTrue(event.updatedAt.isAfter(originalTime));
    }

    @Test
    void applyTransitionToCancelledPreservesOtherFields() {
        UUID expectedOrganizerId = event.organizerId;
        String expectedTitle = event.title;

        publishedState.applyTransition(event, EventStatus.CANCELLED);

        assertEquals(expectedOrganizerId, event.organizerId);
        assertEquals(expectedTitle, event.title);
    }
}
