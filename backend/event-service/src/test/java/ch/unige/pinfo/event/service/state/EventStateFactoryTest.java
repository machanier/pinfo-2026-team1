package ch.unige.pinfo.event.service.state;

import ch.unige.pinfo.event.openapi.model.EventStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EventStateFactoryTest {

    @Test
    void getStateForDraftReturnsCorrectInstance() {
        EventState state = EventStateFactory.getState(EventStatus.DRAFT);

        assertNotNull(state);
        assertInstanceOf(DraftState.class, state);
        assertEquals(EventStatus.DRAFT, state.getStatus());
    }

    @Test
    void getStateForPublishedReturnsCorrectInstance() {
        EventState state = EventStateFactory.getState(EventStatus.PUBLISHED);

        assertNotNull(state);
        assertInstanceOf(PublishedState.class, state);
        assertEquals(EventStatus.PUBLISHED, state.getStatus());
    }

    @Test
    void getStateForCancelledReturnsCorrectInstance() {
        EventState state = EventStateFactory.getState(EventStatus.CANCELLED);

        assertNotNull(state);
        assertInstanceOf(CancelledState.class, state);
        assertEquals(EventStatus.CANCELLED, state.getStatus());
    }

    @Test
    void getStateWithNullThrows() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> EventStateFactory.getState(null));

        assertTrue(exception.getMessage().contains("Status cannot be null"));
    }

    @Test
    void getStateReturnsFreshInstanceEachTime() {
        EventState state1 = EventStateFactory.getState(EventStatus.DRAFT);
        EventState state2 = EventStateFactory.getState(EventStatus.DRAFT);

        // Different instances (factory creates new each time)
        assertNotSame(state1, state2);
        // But equivalent status
        assertEquals(state1.getStatus(), state2.getStatus());
    }

    @Test
    void allStatusesAreCovered() {
        // Verify factory handles all enum values
        for (EventStatus status : EventStatus.values()) {
            EventState state = EventStateFactory.getState(status);
            assertNotNull(state);
            assertEquals(status, state.getStatus());
        }
    }
}
