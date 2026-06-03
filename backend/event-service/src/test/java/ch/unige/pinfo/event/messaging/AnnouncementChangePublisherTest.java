package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.Announcement;
import com.fasterxml.jackson.databind.JsonNode;
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

import java.time.OffsetDateTime;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
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
    void testAnnouncementPostedPublishesPayload() throws Exception {
        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.randomUUID();
        announcement.eventId = UUID.randomUUID();
        announcement.organizerId = UUID.randomUUID();
        announcement.postedAt = OffsetDateTime.now().truncatedTo(ChronoUnit.MILLIS);
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
        // postedAt : on compare les INSTANTS, pas le texte brut. La forme JSON
        // d'un OffsetDateTime et son toString() peuvent différer sur les zéros
        // de fin des fractions de seconde (.86 vs .860) → le match exact
        // "\"postedAt\":\"...\"" était non déterministe (flaky) en CI.
        JsonNode node = objectMapper.readTree(payload);
        assertTrue(OffsetDateTime.parse(node.get("postedAt").asText()).isEqual(announcement.postedAt));
        // eventType est une constante "POSTED" dans le publisher (jamais en
        // cause) : l'assertion stricte est rétablie.
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
        assertFalse(payload.contains("\"postedAt\""));
    }
}