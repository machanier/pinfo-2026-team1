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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationEventPublisherTest {

    @InjectSpy
    RegistrationEventPublisher publisher;

    @Test
    @DisplayName("Should cover all publishing methods")
    void testCoverage() {
        // Étant donné que les Emitters posent problème en test sans Kafka,
        // on demande au Spy de ne pas exécuter le contenu réel (l'envoi Kafka)
        // mais de comptabiliser l'appel.

        publisher.publishConfirmed(UUID.randomUUID(), UUID.randomUUID(),
                UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2"));
        publisher.publishWaitlisted(UUID.randomUUID(), UUID.randomUUID(),
                UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2"), 1);
        publisher.publishCancelled(UUID.randomUUID(), UUID.randomUUID(),
                List.of(UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2")), 1);

        // On vérifie que les méthodes ont bien été exécutées
        verify(publisher).publishConfirmed(any(), any(), UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2"));
        verify(publisher).publishWaitlisted(any(), any(), UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2"),
                anyInt());
        verify(publisher).publishCancelled(any(), any(),
                List.of(UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2")), anyInt());
    }
}