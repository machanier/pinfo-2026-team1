package ch.unige.pinfo.registration.messaging;

import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import jakarta.inject.Inject;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
class EventCancelledConsumerTest {

    @Inject
    EventCancelledConsumer consumer;

    @BeforeEach
    void setUp() {
        PanacheMock.mock(Registration.class);
    }

    @Test
    @DisplayName("Should update status to CANCELLED for all found registrations")
    void testOnEventCancelledSuccess() {
        // GIVEN
        UUID eventId = UUID.randomUUID();
        String message = "{\"eventId\":\"" + eventId + "\"}";

        Registration reg1 = mock(Registration.class);
        Registration reg2 = mock(Registration.class);

        // IMPORTANT: find(String, Object...) = 2 params pour PanacheMock.
        // Le varargs doit être matché avec any(Object[].class), pas eq() par arg.
        var queryMock = mock(io.quarkus.hibernate.orm.panache.PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn(queryMock);
        when(queryMock.list()).thenReturn(List.of(reg1, reg2));

        // WHEN
        consumer.onEventCancelled(message);

        // THEN
        verify(reg1).setStatus(RegistrationStatus.CANCELLED);
        verify(reg1).persist();
        verify(reg2).setStatus(RegistrationStatus.CANCELLED);
        verify(reg2).persist();
    }

    @Test
    @DisplayName("Should do nothing when no registrations are found")
    void testOnEventCancelledNoRegistrations() {
        // GIVEN
        UUID eventId = UUID.randomUUID();
        String message = "{\"eventId\":\"" + eventId + "\"}";

        var queryMock = mock(io.quarkus.hibernate.orm.panache.PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn(queryMock);
        when(queryMock.list()).thenReturn(Collections.emptyList());

        // WHEN — ne doit pas lever d'exception
        consumer.onEventCancelled(message);

        // THEN — la liste était vide, forEach n'est jamais appelé
        verify(queryMock).list();
    }

    @Test
    @DisplayName("Should catch and log when JSON is invalid")
    void testOnEventCancelledErrorPath() {
        // GIVEN — JSON malformé pour couvrir le bloc catch
        String invalidMessage = "{ invalid json }";

        // WHEN — l'exception est catchée en interne, ne doit pas remonter
        consumer.onEventCancelled(invalidMessage);

        // THEN — find() n'a jamais été appelé
        PanacheMock.verify(Registration.class, never()).find(anyString(), any(Object[].class));
    }
}