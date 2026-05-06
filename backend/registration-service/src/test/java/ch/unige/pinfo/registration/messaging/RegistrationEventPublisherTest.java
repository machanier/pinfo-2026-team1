package ch.unige.pinfo.registration.messaging;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationEventPublisherTest {

    @Inject
    RegistrationEventPublisher publisher; // On injecte le VRAI code ici

    @InjectMock
    @Channel("registration-confirmed")
    Emitter<String> confirmedEmitter;

    @InjectMock
    @Channel("registration-waitlisted")
    Emitter<String> waitlistedEmitter;

    @InjectMock
    @Channel("registration-cancelled")
    Emitter<String> cancelledEmitter;

    @Test
    @DisplayName("Should cover publishConfirmed logic")
    void testPublishConfirmed() {
        publisher.publishConfirmed(UUID.randomUUID(), UUID.randomUUID(), "student-1");
        verify(confirmedEmitter).send(anyString());
    }

    @Test
    @DisplayName("Should cover publishWaitlisted logic")
    void testPublishWaitlisted() {
        publisher.publishWaitlisted(UUID.randomUUID(), UUID.randomUUID(), "student-1", 1);
        verify(waitlistedEmitter).send(anyString());
    }

    @Test
    @DisplayName("Should cover publishCancelled logic")
    void testPublishCancelled() {
        publisher.publishCancelled(UUID.randomUUID(), UUID.randomUUID(), List.of("s1"), 5);
        verify(cancelledEmitter).send(anyString());
    }
}