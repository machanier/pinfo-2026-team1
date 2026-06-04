package ch.unige.pinfo.event.service;

import ch.unige.pinfo.event.model.Announcement;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.repository.AnnouncementRepository;
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

@QuarkusTest
@QuarkusTestResource(KafkaCompanionResource.class)
class AnnouncementServiceKafkaPublishingTest {

    @Inject
    AnnouncementService announcementService;

    @Inject
    EventRepository eventRepository;

    @Inject
    AnnouncementRepository announcementRepository;

    @InjectKafkaCompanion
    KafkaCompanion kafkaCompanion;

    private UUID organizerId;
    private Event persistedEvent;

    @BeforeEach
    @Transactional
    void setUp() {
        announcementRepository.deleteAll();
        eventRepository.deleteAll();
        organizerId = UUID.randomUUID();

        // create and persist an event for the announcements
        Event event = new Event();
        event.organizerId = organizerId;
        event.status = ch.unige.pinfo.event.openapi.model.EventStatus.DRAFT;
        event.title = "Event for announcements";
        event.description = "desc";
        event.place = "Room";
        event.time = OffsetDateTime.now().plusDays(1);
        event.capacity = 10;
        eventRepository.persist(event);
        persistedEvent = event;
    }

    @BeforeEach
    void createTopic() {
        try {
            kafkaCompanion.topics().createAndWait("announcement.submitted", 1);
        } catch (Exception ignored) {
        }
        kafkaCompanion.topics().clearIfExists("announcement.submitted");
    }

    private ConsumerTask<String, String> startConsumer(String topic, long expectedRecords) {
        ConsumerBuilder<String, String> builder = kafkaCompanion.consumeStrings()
                .withGroupId("announcement-service-" + UUID.randomUUID())
                .withProp(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        ConsumerTask<String, String> task = builder.fromTopics(topic, expectedRecords);
        builder.waitForAssignment().await().atMost(Duration.ofSeconds(5));
        return task;
    }

    @Test
    void createAnnouncementDoesNotPublishKafkaDirectly() {
        // Kafka publish was moved to AnnouncementResource (called after the
        // @Transactional boundary commits). The service alone must NOT send
        // to announcement.submitted — that would re-introduce the transactional
        // outbox problem that caused HTTP 500 when Kafka is unavailable.
        Announcement request = new Announcement();
        request.eventId = persistedEvent.eventId;
        request.organizerId = organizerId;
        request.body = "New announcement body";

        ConsumerTask<String, String> messages = startConsumer("announcement.submitted", 1);

        Announcement created = announcementService.createAnnouncement(request);

        assertNotNull(created.announcementId);
        assertEquals("New announcement body", created.body);

        // Wait briefly then assert no message was published by the service layer.
        try { Thread.sleep(1500); } catch (InterruptedException ignored) {}
        assertEquals(0, messages.count(),
                "createAnnouncement() must not publish to announcement.submitted " +
                "(Kafka publish belongs in AnnouncementResource after transaction commit)");
    }

}
