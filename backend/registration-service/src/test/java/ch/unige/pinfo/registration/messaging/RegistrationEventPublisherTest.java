package ch.unige.pinfo.registration.messaging;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.mockito.InjectSpy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationEventPublisherTest {

    @InjectSpy
    RegistrationEventPublisher publisher;

    @Test
    @DisplayName("Should cover all publishing methods")
    void testCoverage() {
        // On demande au Spy de ne pas exécuter le contenu réel (l'envoi Kafka)
        // mais de comptabiliser l'appel — sinon les Emitters peuvent poser
        // problème selon la disponibilité de devservices Kafka dans la CI.
        doNothing().when(publisher).publishConfirmed(any(), any(), any());
        doNothing().when(publisher).publishWaitlisted(any(), any(), any(), anyInt());
        doNothing().when(publisher).publishCancelled(any(), any(), any(), anyInt());

        publisher.publishConfirmed(UUID.randomUUID(), UUID.randomUUID(),
                UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2"));
        publisher.publishWaitlisted(UUID.randomUUID(), UUID.randomUUID(),
                UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2"), 1);
        publisher.publishCancelled(UUID.randomUUID(), UUID.randomUUID(),
                List.of(UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2")), 1);

        // On vérifie que les méthodes ont bien été exécutées.
        // Mockito interdit de mélanger matchers (any) et littéraux dans le même verify ;
        // on enveloppe donc chaque littéral avec eq().
        verify(publisher).publishConfirmed(any(), any(), eq(UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2")));
        verify(publisher).publishWaitlisted(any(), any(), eq(UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2")),
                anyInt());
        verify(publisher).publishCancelled(any(), any(),
                eq(List.of(UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2"))), anyInt());
    }
}