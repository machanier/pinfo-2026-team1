package ch.unige.pinfo.registration.messaging;

import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import jakarta.inject.Inject;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
@TestProfile(EventCancelledConsumerTest.KafkaInMemoryProfile.class)
class EventCancelledConsumerTest {

    /**
     * Redirige tous les canaux Kafka vers smallrye-in-memory pour éviter
     * qu'un broker réel soit requis au démarrage du contexte de test.
     */
    public static class KafkaInMemoryProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "mp.messaging.incoming.event-cancelled.connector", "smallrye-in-memory",
                    "mp.messaging.outgoing.registration-confirmed.connector", "smallrye-in-memory",
                    "mp.messaging.outgoing.registration-waitlisted.connector", "smallrye-in-memory",
                    "mp.messaging.outgoing.registration-cancelled.connector", "smallrye-in-memory");
        }
    }

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

        var queryMock = mock(io.quarkus.hibernate.orm.panache.PanacheQuery.class);
        when(Registration.find(anyString(),
                eq(eventId),
                eq(RegistrationStatus.CONFIRMED),
                eq(RegistrationStatus.WAITLISTED)))
                .thenReturn(queryMock);
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

        PanacheMock.mock(Registration.class);
        var queryMock = mock(io.quarkus.hibernate.orm.panache.PanacheQuery.class);
        when(Registration.find(anyString(), any(), any(), any())).thenReturn(queryMock);
        when(queryMock.list()).thenReturn(Collections.emptyList());

        // WHEN — ne doit pas lever d'exception
        consumer.onEventCancelled(message);

        // THEN — la liste était vide, forEach n'est jamais appelé
        verify(queryMock).list(); // la requête a bien été exécutée
    }

    @Test
    @DisplayName("Should catch and log when JSON is invalid")
    void testOnEventCancelledErrorPath() {
        // GIVEN — JSON malformé pour couvrir le bloc catch
        String invalidMessage = "{ invalid json }";

        // WHEN — l'exception est catchée en interne, ne doit pas remonter
        consumer.onEventCancelled(invalidMessage);

        // THEN — aucune interaction avec la base
        PanacheMock.mock(Registration.class);
        Mockito.verifyNoInteractions(Registration.class);
    }
}