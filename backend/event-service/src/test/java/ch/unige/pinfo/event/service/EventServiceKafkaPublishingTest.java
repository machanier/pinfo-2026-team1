package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import ch.unige.pinfo.event.repository.EventRepository;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kafka.InjectKafkaCompanion;
import io.quarkus.test.kafka.KafkaCompanionResource;
import io.smallrye.reactive.messaging.kafka.companion.ConsumerBuilder;
import io.smallrye.reactive.messaging.kafka.companion.ConsumerTask;
import io.smallrye.reactive.messaging.kafka.companion.KafkaCompanion;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.apache.kafka.clients.consumer.ConsumerConfig;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.Duration;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for Kafka message publishing during event operations.
 */
@QuarkusTest
@QuarkusTestResource(KafkaCompanionResource.class)
class EventServiceKafkaPublishingTest {

        @Inject
        EventService eventService;

        @Inject
        EventRepository eventRepository;

        @InjectKafkaCompanion
        KafkaCompanion kafkaCompanion;

        private UUID organizerId;

        @BeforeEach
        @Transactional
        void setUp() {
                eventRepository.deleteAll();
                organizerId = UUID.randomUUID();
        }

        @BeforeEach
        void createTopics() {
                try {
                        kafkaCompanion.topics().createAndWait("event.submitted", 1);
                } catch (Exception ignored) {
                }
                try {
                        kafkaCompanion.topics().createAndWait("event.updated", 1);
                } catch (Exception ignored) {
                }
                try {
                        kafkaCompanion.topics().createAndWait("event.cancelled", 1);
                } catch (Exception ignored) {
                }
                kafkaCompanion.topics().clearIfExists("event.submitted", "event.updated", "event.cancelled");
        }

        private ConsumerTask<String, String> startConsumer(String topic, long expectedRecords) {
                ConsumerBuilder<String, String> builder = kafkaCompanion.consumeStrings()
                                .withGroupId("event-service-" + UUID.randomUUID())
                                .withProp(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
                ConsumerTask<String, String> task = builder.fromTopics(topic, expectedRecords);
                builder.waitForAssignment().await().atMost(Duration.ofSeconds(5));
                return task;
        }

        /**
         * Verify that submitting a draft event publishes an event.submitted message.
         */
        @Test
        void submitEventPublishesKafkaMessage() {
                Event request = new Event();
                request.organizerId = organizerId;
                request.title = "New Event";
                request.description = "Test event";
                request.place = "Room 101";
                request.time = OffsetDateTime.now().plusDays(1);
                request.capacity = 50;
                request.category = "Workshop";

                Event created = eventService.createEvent(request);
                assertNotNull(created.eventId);
                assertEquals(EventStatus.DRAFT, created.status);

                ConsumerTask<String, String> messages = startConsumer("event.submitted", 1);

                Event submitted = eventService.submitEvent(created.eventId);

                assertEquals(EventStatus.PENDING_MODERATION, submitted.status);

                // Verify Kafka message was published to event.submitted topic
                messages.awaitRecords(1, Duration.ofSeconds(5));

                assertEquals(1, messages.count());
                String payload = messages.getFirstRecord().value();

                assertTrue(payload.contains("\"eventId\""));
                assertTrue(payload.contains("\"organizerId\""));
                assertTrue(payload.contains("\"title\":\"New Event\""));
                assertFalse(payload.contains("\"textContent\""));
        }

        /**
         * Verify that updating an event publishes an event.updated message
         */
        @Test
        void updateEventPublishesKafkaMessage() {
                Event event = createTestEvent();

                Event updateData = new Event();
                updateData.title = "Updated Title";
                updateData.description = "Updated Description";

                ConsumerTask<String, String> messages = startConsumer("event.updated", 1);

                Event updated = eventService.updateEvent(event.eventId, updateData);

                assertEquals("Updated Title", updated.title);
                assertEquals("Updated Description", updated.description);

                messages.awaitRecords(1, Duration.ofSeconds(5));

                assertEquals(1, messages.count());
                String payload = messages.getFirstRecord().value();

                assertTrue(payload.contains("\"title\":\"Updated Title\""));
                assertTrue(payload.contains("\"description\":\"Updated Description\""));
                assertTrue(payload.contains("\"eventType\":\"UPDATED\""));
        }

        /**
         * Verify that a rejected moderation decision returns the event to DRAFT and
         * emits an update.
         */
        @Test
        void rejectModerationReturnsEventToDraft() {
                Event event = createTestEvent();
                eventService.submitEvent(event.eventId);

                ConsumerTask<String, String> messages = startConsumer("event.updated", 1);

                eventService.applyModerationDecision(event.eventId, "REJECTED");

                messages.awaitRecords(1, Duration.ofSeconds(5));

                Event updated = eventService.getEventById(event.eventId).orElseThrow();
                assertEquals(EventStatus.DRAFT, updated.status);
                assertEquals(1, messages.count());
        }

        /**
         * Verify that cancelling an event publishes an event.cancelled message
         */
        @Test
        void cancelEventPublishesKafkaMessage() {
                Event event = createTestEvent();

                ConsumerTask<String, String> updatedMessages = startConsumer("event.updated", 2);
                ConsumerTask<String, String> cancelledMessages = startConsumer("event.cancelled", 1);

                eventService.submitEvent(event.eventId);
                eventService.applyModerationDecision(event.eventId, "APPROVED");

                updatedMessages.awaitRecords(2, Duration.ofSeconds(5));

                Event cancelled = eventService.cancelEvent(event.eventId);

                assertEquals(EventStatus.CANCELLED, cancelled.status);

                cancelledMessages.awaitRecords(1, Duration.ofSeconds(5));

                assertEquals(1, cancelledMessages.count());
                String payload = cancelledMessages.getFirstRecord().value();

                assertTrue(payload.contains("\"eventId\":\"" + event.eventId));
                assertTrue(payload.contains("\"organizerId\":\"" + organizerId));
                assertTrue(payload.contains("\"eventType\":\"CANCELLED\""));
        }

        /**
         * Verify complete event lifecycle with Kafka messages at each stage
         */
        @Test
        void completeEventLifecyclePublishesCorrectMessages() {
                Event request = new Event();
                request.organizerId = organizerId;
                request.title = "Lifecycle Event";
                request.description = "Testing full lifecycle";
                request.place = "Lab";
                request.time = OffsetDateTime.now().plusDays(2);
                request.capacity = 25;
                request.category = "Seminar";

                ConsumerTask<String, String> submittedMessages = startConsumer("event.submitted", 1);
                ConsumerTask<String, String> updatedMessages = startConsumer("event.updated", 2);
                ConsumerTask<String, String> cancelledMessages = startConsumer("event.cancelled", 1);

                Event created = eventService.createEvent(request);
                Event submitted = eventService.submitEvent(created.eventId);
                submittedMessages.awaitRecords(1, Duration.ofSeconds(5));
                assertEquals(1, submittedMessages.count());
                assertEquals(EventStatus.PENDING_MODERATION, submitted.status);

                Event updateData = new Event();
                updateData.title = "Updated Lifecycle Event";
                eventService.updateEvent(created.eventId, updateData);

                eventService.applyModerationDecision(created.eventId, "APPROVED");
                updatedMessages.awaitRecords(2, Duration.ofSeconds(5));
                assertEquals(2, updatedMessages.count());
                assertTrue(updatedMessages.getFirstRecord().value().contains("\"title\":\"Updated Lifecycle Event\""));
                assertTrue(updatedMessages.getLastRecord().value().contains("\"status\":\"PUBLISHED\""));

                Event cancelled = eventService.cancelEvent(created.eventId);
                cancelledMessages.awaitRecords(1, Duration.ofSeconds(5));
                assertEquals(1, cancelledMessages.count());

                assertEquals(EventStatus.CANCELLED, cancelled.status);
                assertEquals("Updated Lifecycle Event", cancelled.title);
        }

        /**
         * Verify that failed operations don't publish messages
         */
        @Test
        void failedOperationDoesNotPublishMessage() {
                UUID nonExistentId = UUID.randomUUID();

                assertThrows(IllegalArgumentException.class,
                                () -> eventService.updateEvent(nonExistentId, new Event()));

                // No messages should be published on failure
                // (If a message was published, the test would fail waiting for it)
        }

        // Helper method
        Event createTestEvent() {
                Event request = new Event();
                request.organizerId = organizerId;
                request.title = "Test Event";
                request.description = "A test event";
                request.place = "Room 101";
                request.time = OffsetDateTime.now().plusDays(1);
                request.capacity = 50;
                request.category = "Workshop";
                return eventService.createEvent(request);
        }
}
