package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.EventRegistrationCount;
import ch.unige.pinfo.event.repository.EventRegistrationCountRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RegistrationEventConsumer}.
 *
 * The Kafka channels are configured but cannot reach a broker in this context;
 * they retry silently in the background. The consumer methods are called
 * directly to test the business logic in isolation.
 */
@QuarkusTest
class RegistrationEventConsumerTest {

    @Inject
    RegistrationEventConsumer consumer;

    @InjectMock
    EventRegistrationCountRepository countRepository;

    // registration.confirmed

    @Test
    void confirmed_createsNewRowWhenNoneExists() {
        UUID eventId = UUID.randomUUID();
        when(countRepository.findByIdOptional(eventId)).thenReturn(Optional.empty());

        consumer.onRegistrationConfirmed(confirmedMsg(UUID.randomUUID(), eventId, "student1"));

        ArgumentCaptor<EventRegistrationCount> captor = ArgumentCaptor.forClass(EventRegistrationCount.class);
        verify(countRepository).persist(captor.capture());
        assertEquals(eventId, captor.getValue().eventId);
        assertEquals(1, captor.getValue().registeredCount);
    }

    @Test
    void confirmed_incrementsExistingRow() {
        UUID eventId = UUID.randomUUID();
        EventRegistrationCount existing = countWith(eventId, 3);
        when(countRepository.findByIdOptional(eventId)).thenReturn(Optional.of(existing));

        consumer.onRegistrationConfirmed(confirmedMsg(UUID.randomUUID(), eventId, "student2"));

        verify(countRepository).persist(existing);
        assertEquals(4, existing.registeredCount);
    }

    @Test
    void confirmed_eachCallIncrementsIndependently() {
        UUID eventId = UUID.randomUUID();
        EventRegistrationCount row = countWith(eventId, 0);
        when(countRepository.findByIdOptional(eventId)).thenReturn(Optional.of(row));

        consumer.onRegistrationConfirmed(confirmedMsg(UUID.randomUUID(), eventId, "s1"));
        consumer.onRegistrationConfirmed(confirmedMsg(UUID.randomUUID(), eventId, "s2"));

        verify(countRepository, times(2)).persist(row);
        assertEquals(2, row.registeredCount);
    }

    @Test
    void confirmed_ignoresMalformedJson() {
        assertDoesNotThrow(() -> consumer.onRegistrationConfirmed("{bad json"));
        verify(countRepository, never()).persist(any(EventRegistrationCount.class));
    }

    @Test
    void confirmed_ignoresMessageMissingEventIdField() {
        assertDoesNotThrow(
                () -> consumer.onRegistrationConfirmed("{\"registrationId\":\"" + UUID.randomUUID() + "\"}"));
        verify(countRepository, never()).persist(any(EventRegistrationCount.class));
    }

    // registration.cancelled

    @Test
    void cancelled_decrementsExistingRow() {
        UUID eventId = UUID.randomUUID();
        EventRegistrationCount existing = countWith(eventId, 2);
        when(countRepository.findByIdOptional(eventId)).thenReturn(Optional.of(existing));

        consumer.onRegistrationCancelled(cancelledMsg(UUID.randomUUID(), eventId));

        verify(countRepository).persist(existing);
        assertEquals(1, existing.registeredCount);
    }

    @Test
    void cancelled_decrementsToZero() {
        UUID eventId = UUID.randomUUID();
        EventRegistrationCount existing = countWith(eventId, 1);
        when(countRepository.findByIdOptional(eventId)).thenReturn(Optional.of(existing));

        consumer.onRegistrationCancelled(cancelledMsg(UUID.randomUUID(), eventId));

        verify(countRepository).persist(existing);
        assertEquals(0, existing.registeredCount);
    }

    @Test
    void cancelled_doesNotDecrementBelowZero() {
        UUID eventId = UUID.randomUUID();
        EventRegistrationCount existing = countWith(eventId, 0);
        when(countRepository.findByIdOptional(eventId)).thenReturn(Optional.of(existing));

        consumer.onRegistrationCancelled(cancelledMsg(UUID.randomUUID(), eventId));

        verify(countRepository, never()).persist(any(EventRegistrationCount.class));
        assertEquals(0, existing.registeredCount);
    }

    @Test
    void cancelled_noOpWhenNoRowExists() {
        UUID eventId = UUID.randomUUID();
        when(countRepository.findByIdOptional(eventId)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> consumer.onRegistrationCancelled(cancelledMsg(UUID.randomUUID(), eventId)));
        verify(countRepository, never()).persist(any(EventRegistrationCount.class));
    }

    @Test
    void cancelled_ignoresMalformedJson() {
        assertDoesNotThrow(() -> consumer.onRegistrationCancelled("{bad json"));
        verify(countRepository, never()).persist(any(EventRegistrationCount.class));
    }

    // Helpers

    private EventRegistrationCount countWith(UUID eventId, int count) {
        EventRegistrationCount c = new EventRegistrationCount();
        c.eventId = eventId;
        c.registeredCount = count;
        return c;
    }

    private String confirmedMsg(UUID registrationId, UUID eventId, String studentId) {
        return "{\"registrationId\":\"" + registrationId
                + "\",\"eventId\":\"" + eventId
                + "\",\"studentId\":\"" + studentId + "\"}";
    }

    private String cancelledMsg(UUID registrationId, UUID eventId) {
        return "{\"registrationId\":\"" + registrationId
                + "\",\"eventId\":\"" + eventId
                + "\",\"waitlistedStudentIds\":[],\"availableSlots\":5}";
    }
}
