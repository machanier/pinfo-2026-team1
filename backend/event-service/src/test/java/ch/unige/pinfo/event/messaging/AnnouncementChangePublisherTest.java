package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.Announcement;
import com.fasterxml.jackson.core.JsonProcessingException;
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
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.OffsetDateTime;
import java.time.Duration;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@QuarkusTestResource(KafkaCompanionResource.class)
class AnnouncementChangePublisherTest {

    @Inject
    AnnouncementChangePublisher publisher;

    @Inject
    ObjectMapper objectMapper;

    @InjectKafkaCompanion
    KafkaCompanion kafkaCompanion;

    @BeforeEach
    void ensureTopic() {
        try {
            kafkaCompanion.topics().createAndWait("announcement.posted", 1);
            kafkaCompanion.topics().createAndWait("announcement.submitted", 1);
        } catch (Exception ignored) {
        }
        kafkaCompanion.topics().clearIfExists("announcement.posted");
        kafkaCompanion.topics().clearIfExists("announcement.submitted");
    }

    private ConsumerTask<String, String> startConsumer(String topic, long expectedRecords) {
        ConsumerBuilder<String, String> builder = kafkaCompanion.consumeStrings()
                .withGroupId("announcement-change-" + UUID.randomUUID())
                .withProp(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        ConsumerTask<String, String> task = builder.fromTopics(topic, expectedRecords);
        builder.waitForAssignment().await().atMost(Duration.ofSeconds(5));
        return task;
    }

    @Test
    void testAnnouncementPostedPublishesPayload() {
        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.randomUUID();
        announcement.eventId = UUID.randomUUID();
        announcement.organizerId = UUID.randomUUID();
        announcement.postedAt = OffsetDateTime.now();
        announcement.body = "Important update";

        ConsumerTask<String, String> messages = startConsumer("announcement.posted", 1);

        publisher.announcementPosted(announcement);

        messages.awaitRecords(1, Duration.ofSeconds(5));

        assertEquals(1, messages.count());
        String payload = messages.getFirstRecord().value();

        assertTrue(payload.contains("\"announcementId\":\"" + announcement.announcementId));
        assertTrue(payload.contains("\"eventId\":\"" + announcement.eventId));
        assertTrue(payload.contains("\"organizerId\":\"" + announcement.organizerId));
        assertTrue(payload.contains("\"body\":\"Important update\""));
        assertTrue(payload.contains("\"eventType\":\"POSTED\""));
    }

    @Test
    void testAnnouncementSubmittedPublishesPayload() {
        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.randomUUID();
        announcement.eventId = UUID.randomUUID();
        announcement.organizerId = UUID.randomUUID();
        announcement.body = "Submitted announcement";

        ConsumerTask<String, String> messages = startConsumer("announcement.submitted", 1);

        publisher.announcementSubmitted(announcement);

        messages.awaitRecords(1, Duration.ofSeconds(5));

        assertEquals(1, messages.count());
        String payload = messages.getFirstRecord().value();

        assertTrue(payload.contains("\"announcementId\":\"" + announcement.announcementId));
        assertTrue(payload.contains("\"eventId\":\"" + announcement.eventId));
        assertTrue(payload.contains("\"organizerId\":\"" + announcement.organizerId));
        assertTrue(payload.contains("\"body\":\"Submitted announcement\""));
        assertTrue(payload.contains("\"eventType\":\"SUBMITTED\""));
    }

    @Test
    void testAnnouncementPostedHandlesExceptionGracefully() throws JsonProcessingException {
        // Arrange: Create a purely isolated unit instance to avoid messing up Quarkus CDI context
        AnnouncementChangePublisher isolatedPublisher = new AnnouncementChangePublisher();
        
        ObjectMapper mockMapper = Mockito.mock(ObjectMapper.class);
        Mockito.when(mockMapper.writeValueAsString(Mockito.any())).thenThrow(new RuntimeException("Simulated Jackson exception"));
        
        isolatedPublisher.objectMapper = mockMapper;
        isolatedPublisher.announcementEmitter = Mockito.mock(Emitter.class);

        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.randomUUID();

        // Act & Assert: Ensure the method catches the internal error instead of blowing up the runtime
        assertDoesNotThrow(() -> isolatedPublisher.announcementPosted(announcement));
    }

    @Test
    void testAnnouncementSubmittedHandlesExceptionGracefully() throws JsonProcessingException {
        // Arrange
        AnnouncementChangePublisher isolatedPublisher = new AnnouncementChangePublisher();
        
        ObjectMapper mockMapper = Mockito.mock(ObjectMapper.class);
        Mockito.when(mockMapper.writeValueAsString(Mockito.any())).thenThrow(new RuntimeException("Simulated Jackson exception"));
        
        isolatedPublisher.objectMapper = mockMapper;
        isolatedPublisher.announcementSubmittedEmitter = Mockito.mock(Emitter.class);

        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.randomUUID();

        // Act & Assert
        assertDoesNotThrow(() -> isolatedPublisher.announcementSubmitted(announcement));
    }
}