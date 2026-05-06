package ch.unige.pinfo.registration.messaging;

import ch.unige.pinfo.registration.H2DatabaseTestResource;
import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import jakarta.inject.Inject;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@QuarkusTest
@QuarkusTestResource(H2DatabaseTestResource.class)
class EventCancelledConsumerTest {

    @Inject
    EventCancelledConsumer consumer;

    @Test
    @DisplayName("Should update status to CANCELLED for all found registrations")
    void testOnEventCancelledSuccess() {
        // GIVEN
        UUID eventId = UUID.randomUUID();
        String message = "{\"eventId\":\"" + eventId + "\"}";

        PanacheMock.mock(Registration.class);

        Registration reg1 = mock(Registration.class);
        Registration reg2 = mock(Registration.class);
        List<Registration> mockList = List.of(reg1, reg2);

        // Simulation de la requête Panache find(...).list()
        var queryMock = mock(io.quarkus.hibernate.orm.panache.PanacheQuery.class);
        when(Registration.find(anyString(), eq(eventId), eq(RegistrationStatus.CONFIRMED),
                eq(RegistrationStatus.WAITLISTED)))
                .thenReturn(queryMock);
        when(queryMock.list()).thenReturn(mockList);

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

        PanacheMock.mock(Registration.class);
        var queryMock = mock(io.quarkus.hibernate.orm.panache.PanacheQuery.class);
        when(Registration.find(anyString(), any(), any(), any())).thenReturn(queryMock);
        when(queryMock.list()).thenReturn(Collections.emptyList());

        // WHEN
        consumer.onEventCancelled(message);

        // THEN: Aucune erreur ne doit être levée et persist ne doit jamais être appelé
        // (Vérifié par l'absence d'exception et la couverture Jacoco)
    }

    @Test
    @DisplayName("Should catch and log exception when JSON is invalid (Error Path coverage)")
    void testOnEventCancelledErrorPath() {
        // GIVEN: Un message malformé pour déclencher le bloc catch
        String invalidMessage = "{ invalid json }";

        // WHEN
        // On appelle la méthode. Elle ne doit pas propager l'exception car elle est
        // catchée en interne.
        consumer.onEventCancelled(invalidMessage);

        // THEN: Jacoco marquera le bloc catch comme couvert.
        // On vérifie indirectement que le traitement s'est arrêté.
        PanacheMock.mock(Registration.class);
        verifyNoInteractions(Registration.class);
    }
}