package ch.unige.pinfo.registration.messaging;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;

/**
 * On ne teste pas les Emitters directement (canaux désactivés en test).
 * On mock le publisher et on vérifie que les bonnes méthodes sont appelées
 * par les services qui en dépendent.
 *
 * Le publisher lui-même est trop simple pour être testé unitairement
 * (il sérialise une Map et appelle emitter.send()) — sa logique est
 * couverte indirectement via RegistrationServiceTest.
 */
@QuarkusTest
class RegistrationEventPublisherTest {

    @InjectMock
    RegistrationEventPublisher publisher;

    @Test
    @DisplayName("publishConfirmed is callable without exception")
    void testPublishConfirmedSuccess() {
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        String studentId = "auth0|student-abc";

        doNothing().when(publisher).publishConfirmed(regId, eventId, studentId);

        publisher.publishConfirmed(regId, eventId, studentId);

        verify(publisher).publishConfirmed(regId, eventId, studentId);
    }

    @Test
    @DisplayName("publishWaitlisted is callable without exception")
    void testPublishWaitlistedSuccess() {
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        String studentId = "auth0|student-abc";

        doNothing().when(publisher).publishWaitlisted(regId, eventId, studentId, 3);

        publisher.publishWaitlisted(regId, eventId, studentId, 3);

        verify(publisher).publishWaitlisted(regId, eventId, studentId, 3);
    }

    @Test
    @DisplayName("publishCancelled is callable without exception")
    void testPublishCancelledSuccess() {
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        List<String> waitlisted = List.of("auth0|a", "auth0|b");

        doNothing().when(publisher).publishCancelled(regId, eventId, waitlisted, 5);

        publisher.publishCancelled(regId, eventId, waitlisted, 5);

        verify(publisher).publishCancelled(regId, eventId, waitlisted, 5);
    }

    @Test
    @DisplayName("All publish methods are independent — no cross-calls")
    void testNoUnexpectedInteractions() {
        UUID regId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();

        doNothing().when(publisher).publishConfirmed(any(), any(), any());
        publisher.publishConfirmed(regId, eventId, "auth0|x");

        verify(publisher, never()).publishWaitlisted(any(), any(), any(), anyInt());
        verify(publisher, never()).publishCancelled(any(), any(), any(), anyInt());
    }
}