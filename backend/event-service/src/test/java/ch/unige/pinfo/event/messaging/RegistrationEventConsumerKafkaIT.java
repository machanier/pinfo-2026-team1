package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.DockerAvailableCondition;
import ch.unige.pinfo.event.repository.EventRegistrationCountRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kafka.InjectKafkaCompanion;
import io.quarkus.test.kafka.KafkaCompanionResource;
import io.smallrye.reactive.messaging.kafka.companion.KafkaCompanion;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for {@link RegistrationEventConsumer}.
 *
 * An embedded Kafka broker is started via {@link KafkaCompanionResource}.
 * Messages are produced directly to the topics; the consumer picks them up
 * and updates the {@code event_registration_counts} table. Awaitility is used
 * to wait for the asynchronous processing to complete before asserting.
 *
 * Repository reads are wrapped in {@code QuarkusTransaction.requiringNew()}
 * because the test thread has no active transaction context; each poll needs
 * its own short-lived transaction to see the consumer's committed writes.
 */
@QuarkusTest
@QuarkusTestResource(value = KafkaCompanionResource.class, restrictToAnnotatedClass = true)
@ExtendWith(DockerAvailableCondition.class)
class RegistrationEventConsumerKafkaIT {

    @InjectKafkaCompanion
    KafkaCompanion kafkaCompanion;

    @Inject
    EventRegistrationCountRepository countRepository;

    @BeforeEach
    void ensureTopics() {
        try {
            kafkaCompanion.topics().createAndWait("registration.confirmed", 1);
        } catch (Exception ignored) {
        }
        try {
            kafkaCompanion.topics().createAndWait("registration.cancelled", 1);
        } catch (Exception ignored) {
        }
    }

    @BeforeEach
    @Transactional
    void cleanCounts() {
        countRepository.deleteAll();
    }

    // registration.confirmed

    @Test
    void confirmedMessage_createsCountRow() {
        UUID eventId = UUID.randomUUID();

        produce("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventId, "s1"));

        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventId) == 1);

        assertEquals(1, fetchCount(eventId));
    }

    @Test
    void confirmedMessages_accumulateCount() {
        UUID eventId = UUID.randomUUID();

        kafkaCompanion.produceStrings()
                .fromRecords(
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventId, "s1")),
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventId, "s2")),
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventId, "s3")))
                .awaitCompletion(Duration.ofSeconds(5));

        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventId) == 3);

        assertEquals(3, fetchCount(eventId));
    }

    @Test
    void confirmedMessages_forDifferentEventsAreIndependent() {
        UUID eventA = UUID.randomUUID();
        UUID eventB = UUID.randomUUID();

        kafkaCompanion.produceStrings()
                .fromRecords(
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventA, "s1")),
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventA, "s2")),
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventB, "s3")))
                .awaitCompletion(Duration.ofSeconds(5));

        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventA) == 2);

        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventB) == 1);

        assertEquals(2, fetchCount(eventA));
        assertEquals(1, fetchCount(eventB));
    }

    // registration.cancelled

    @Test
    void cancelledMessage_decrementsCount() {
        UUID eventId = UUID.randomUUID();

        // confirm two registrations first
        kafkaCompanion.produceStrings()
                .fromRecords(
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventId, "s1")),
                        record("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventId, "s2")))
                .awaitCompletion(Duration.ofSeconds(5));

        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventId) == 2);

        // cancel one
        produce("registration.cancelled", cancelledMsg(UUID.randomUUID(), eventId));

        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventId) == 1);

        assertEquals(1, fetchCount(eventId));
    }

    @Test
    void cancelledMessage_noOpWhenNoRowExists() {
        UUID eventId = UUID.randomUUID();

        produce("registration.cancelled", cancelledMsg(UUID.randomUUID(), eventId));

        // Allow time for the consumer to process; the row must never appear
        Awaitility.await()
                .during(2, TimeUnit.SECONDS)
                .atMost(5, TimeUnit.SECONDS)
                .until(() -> rowAbsent(eventId));

        assertTrue(rowAbsent(eventId),
                "No row should be created by a cancelled message with no prior confirmed registration");
    }

    @Test
    void cancelledMessage_doesNotDecrementBelowZero() {
        UUID eventId = UUID.randomUUID();

        // confirm one, then cancel twice
        produce("registration.confirmed", confirmedMsg(UUID.randomUUID(), eventId, "s1"));

        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventId) == 1);

        kafkaCompanion.produceStrings()
                .fromRecords(
                        record("registration.cancelled", cancelledMsg(UUID.randomUUID(), eventId)),
                        record("registration.cancelled", cancelledMsg(UUID.randomUUID(), eventId)))
                .awaitCompletion(Duration.ofSeconds(5));

        // count must reach 0 but never go negative
        Awaitility.await()
                .atMost(10, TimeUnit.SECONDS)
                .until(() -> fetchCount(eventId) == 0);

        assertEquals(0, fetchCount(eventId));
    }

    // Helpers

    /**
     * Reads the registered count for the given event inside a new transaction.
     * Returns 0 if no row exists yet.
     */
    private int fetchCount(UUID eventId) {
        try {
            return QuarkusTransaction.requiringNew().<Integer>call(
                    () -> countRepository.findByIdOptional(eventId)
                            .map(c -> c.registeredCount)
                            .orElse(0));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Returns true if no count row exists for the given event, inside a new
     * transaction.
     */
    private boolean rowAbsent(UUID eventId) {
        try {
            return QuarkusTransaction.requiringNew().<Boolean>call(
                    () -> countRepository.findByIdOptional(eventId).isEmpty());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void produce(String topic, String payload) {
        kafkaCompanion.produceStrings()
                .fromRecords(record(topic, payload))
                .awaitCompletion(Duration.ofSeconds(5));
    }

    private ProducerRecord<String, String> record(String topic, String payload) {
        return new ProducerRecord<>(topic, payload);
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
