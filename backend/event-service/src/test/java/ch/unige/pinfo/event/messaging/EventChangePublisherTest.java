package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kafka.InjectKafkaCompanion;
import io.quarkus.test.kafka.KafkaCompanionResource;
import io.smallrye.reactive.messaging.kafka.companion.ConsumerBuilder;
import io.smallrye.reactive.messaging.kafka.companion.ConsumerTask;
import io.smallrye.reactive.messaging.kafka.companion.KafkaCompanion;
import jakarta.inject.Inject;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@QuarkusTestResource(KafkaCompanionResource.class)
class EventChangePublisherTest {

        @Inject
        EventChangePublisher eventChangePublisher;

        @Inject
        ObjectMapper objectMapper;

        @InjectKafkaCompanion
        KafkaCompanion kafkaCompanion;

        @BeforeEach
        void ensureTopicsExist() {
                try {
                        kafkaCompanion.topics().createAndWait("event.created", 1);
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
                kafkaCompanion.topics().clearIfExists("event.created", "event.updated", "event.cancelled");
        }

        private ConsumerTask<String, String> startConsumer(String topic, long expectedRecords) {
                ConsumerBuilder<String, String> builder = kafkaCompanion.consumeStrings()
                                .withGroupId("event-change-" + UUID.randomUUID())
                                .withProp(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
                ConsumerTask<String, String> task = builder.fromTopics(topic, expectedRecords);
                builder.waitForAssignment().await().atMost(Duration.ofSeconds(5));
                return task;
        }

        /**
         * Test that eventCreated publishes a complete event payload with all obligatory
         * fields
         */
        @Test
        void testEventCreatedPublishesFullPayload() throws Exception {
                Event event = createTestEvent();
                event.eventId = UUID.randomUUID();
                event.organizerId = UUID.randomUUID();

                ConsumerTask<String, String> messages = startConsumer("event.created", 1);

                eventChangePublisher.eventCreated(event);

                // Verify message was published to event.created topic
                messages.awaitRecords(1, Duration.ofSeconds(5));

                assertEquals(1, messages.count());
                String payload = messages.getFirstRecord().value();

                // Verify all obligatory fields are present
                assertTrue(payload.contains("\"eventId\":\"" + event.eventId));
                assertTrue(payload.contains("\"organizerId\":\"" + event.organizerId));
                assertTrue(payload.contains("\"title\":\"Test Event\""));
                assertTrue(payload.contains("\"status\":\"DRAFT\""));
                assertTrue(payload.contains("\"capacity\":50"));
                assertTrue(payload.contains("\"eventType\":\"CREATED\""));
        }

        /**
         * Test that eventUpdated publishes event with updated timestamp
         */
        @Test
        void testEventUpdatedPublishesUpdatedPayload() throws Exception {
                Event event = createTestEvent();
                event.eventId = UUID.randomUUID();
                event.organizerId = UUID.randomUUID();
                OffsetDateTime beforeUpdate = event.updatedAt;

                // Small delay to ensure timestamp differs
                Thread.sleep(10);
                event.updatedAt = OffsetDateTime.now();

                ConsumerTask<String, String> messages = startConsumer("event.updated", 1);

                eventChangePublisher.eventUpdated(event);

                messages.awaitRecords(1, Duration.ofSeconds(5));

                assertEquals(1, messages.count());
                String payload = messages.getFirstRecord().value();

                // Verify timestamp was updated
                assertTrue(payload.contains("\"eventType\":\"UPDATED\""));
                assertTrue(payload.contains("\"eventId\":\"" + event.eventId));
                assertTrue(event.updatedAt.isAfter(beforeUpdate));
        }

        /**
         * Test that eventCancelled publishes lightweight payload with only IDs
         */
        @Test
        void testEventCancelledPublishesLightweightPayload() throws Exception {
                UUID eventId = UUID.randomUUID();
                UUID organizerId = UUID.randomUUID();

                ConsumerTask<String, String> messages = startConsumer("event.cancelled", 1);

                eventChangePublisher.eventCancelled(eventId, organizerId);

                // Verify message was published to event.cancelled topic
                messages.awaitRecords(1, Duration.ofSeconds(5));

                assertEquals(1, messages.count());
                String payload = messages.getFirstRecord().value();

                // Verify payload contains only IDs and type
                assertTrue(payload.contains("\"eventId\":\"" + eventId));
                assertTrue(payload.contains("\"organizerId\":\"" + organizerId));
                assertTrue(payload.contains("\"eventType\":\"CANCELLED\""));

                // Verify that full event details are not in the payload
                assertFalse(payload.contains("\"title\""));
                assertFalse(payload.contains("\"description\""));
        }

        /**
         * Test that eventCreated handles null optional fields gracefully
         */
        @Test
        void testEventCreatedWithNullOptionalFields() throws Exception {
                Event event = new Event();
                event.eventId = UUID.randomUUID();
                event.organizerId = UUID.randomUUID();
                event.status = EventStatus.DRAFT;
                event.createdAt = OffsetDateTime.now();
                event.updatedAt = OffsetDateTime.now();
                event.title = "Test Event";
                event.description = "Test Description";
                event.place = "Test Place";
                event.time = OffsetDateTime.now();
                event.capacity = 100;
                event.category = "Test Category";
                event.tags = null;
                event.restrictedTo = null;

                ConsumerTask<String, String> messages = startConsumer("event.created", 1);

                eventChangePublisher.eventCreated(event);

                messages.awaitRecords(1, Duration.ofSeconds(5));
                assertEquals(1, messages.count());
        }

        /**
         * Test that multiple events can be published without interference
         */
        @Test
        void testMultipleEventsPublishedIndependently() throws Exception {
                Event event1 = createTestEvent();
                event1.eventId = UUID.randomUUID();
                event1.title = "Event 1";

                Event event2 = createTestEvent();
                event2.eventId = UUID.randomUUID();
                event2.title = "Event 2";

                ConsumerTask<String, String> createdMessages = startConsumer("event.created", 2);
                ConsumerTask<String, String> updatedMessages = startConsumer("event.updated", 1);

                eventChangePublisher.eventCreated(event1);
                eventChangePublisher.eventCreated(event2);
                eventChangePublisher.eventUpdated(event1);

                // Verify correct number of messages
                createdMessages.awaitRecords(2, Duration.ofSeconds(5));
                assertEquals(2, createdMessages.count());

                updatedMessages.awaitRecords(1, Duration.ofSeconds(5));
                assertEquals(1, updatedMessages.count());
        }

        /**
         * Test that eventCancelled and eventUpdated can be called for same event
         */
        @Test
        void testEventLifecycleMessages() throws Exception {
                UUID eventId = UUID.randomUUID();
                UUID organizerId = UUID.randomUUID();
                Event event = createTestEvent();
                event.eventId = eventId;
                event.organizerId = organizerId;

                ConsumerTask<String, String> createdMessages = startConsumer("event.created", 1);
                ConsumerTask<String, String> updatedMessages = startConsumer("event.updated", 1);
                ConsumerTask<String, String> cancelledMessages = startConsumer("event.cancelled", 1);

                eventChangePublisher.eventCreated(event);
                event.status = EventStatus.PUBLISHED;
                event.updatedAt = OffsetDateTime.now();
                eventChangePublisher.eventUpdated(event);
                eventChangePublisher.eventCancelled(eventId, organizerId);

                // Verify all messages were published
                createdMessages.awaitRecords(1, Duration.ofSeconds(5));
                assertEquals(1, createdMessages.count());

                updatedMessages.awaitRecords(1, Duration.ofSeconds(5));
                assertEquals(1, updatedMessages.count());

                cancelledMessages.awaitRecords(1, Duration.ofSeconds(5));
                assertEquals(1, cancelledMessages.count());
        }

        // Helper method to create a complete test event
        private Event createTestEvent() {
                Event event = new Event();
                event.organizerId = UUID.randomUUID();
                event.status = EventStatus.DRAFT;
                event.createdAt = OffsetDateTime.now();
                event.updatedAt = OffsetDateTime.now();
                event.title = "Test Event";
                event.description = "A test event for publishing";
                event.place = "Test Location";
                event.time = OffsetDateTime.now().plusDays(1);
                event.endTime = OffsetDateTime.now().plusDays(1).plusHours(2);
                event.capacity = 50;
                event.category = "Workshop";
                event.tags = Arrays.asList("test", "kafka");
                return event;
        }
}
