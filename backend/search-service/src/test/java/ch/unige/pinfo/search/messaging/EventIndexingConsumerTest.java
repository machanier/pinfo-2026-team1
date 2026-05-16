package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.EventDto;
import ch.unige.pinfo.search.dto.KafkaEventMessage;
import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.repository.SearchEventRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@QuarkusTest
public class EventIndexingConsumerTest {

    @Inject
    EventIndexingConsumer consumer;

    @Inject
    ObjectMapper objectMapper;

    @InjectMock
    SearchEventRepository repository;

    private KafkaEventMessage message;
    private UUID eventId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        EventDto eventDto = new EventDto();
        eventDto.setEventId(eventId);
        eventDto.setTitle("Soirée Escalade");
        eventDto.setOrganizerId(UUID.randomUUID().toString());
        eventDto.setCapacity(20);
        eventDto.setRegisteredCount(5);

        message = new KafkaEventMessage();
        message.setEvent(eventDto);
        message.setAction("CREATED");
    }

    @Test
    @Transactional
    void testEventIndexConsume_UpsertNew() throws Exception {
        when(repository.findByEventId(eventId)).thenReturn(null);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        verify(repository).findByEventId(eventId);
        verify(repository).persist(any(SearchEvent.class));
    }

    @Test
    @Transactional
    void testEventIndexConsume_DeleteAction() throws Exception {
        message.setAction("DELETED");
        when(repository.deleteByEventId(eventId)).thenReturn(true);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        verify(repository).deleteByEventId(eventId);
    }

    @Test
    @Transactional
    void testEventIndexConsume_IsFullLogic() throws Exception {
        message.getEvent().setCapacity(10);
        message.getEvent().setRegisteredCount(10);

        SearchEvent mockEntity = new SearchEvent();
        mockEntity.eventId = eventId;

        when(repository.findByEventId(eventId)).thenReturn(mockEntity);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        assertTrue(mockEntity.isFull);
    }

    @Test
    @Transactional
    void testEventIndexConsume_InvalidJson() {
        assertDoesNotThrow(() -> consumer.eventIndexConsume("invalid-json"));
    }

    @Test
    @Transactional
    void testEventIndexConsume_DeleteAction_NotFound() throws Exception {
        message.setAction("DELETED");
        when(repository.deleteByEventId(eventId)).thenReturn(false);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        verify(repository).deleteByEventId(eventId);
    }

    @Test
    @Transactional
    void testEventIndexConsume_UpsertExisting() throws Exception {
        SearchEvent existing = new SearchEvent();
        existing.eventId = eventId;
        existing.title = "Old Title";

        when(repository.findByEventId(eventId)).thenReturn(existing);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        verify(repository).findByEventId(eventId);
        verify(repository).persist(existing);
        assertEquals("Soirée Escalade", existing.title);
    }

    @Test
    @Transactional
    void testEventIndexConsume_NullCapacity() throws Exception {
        message.getEvent().setCapacity(null);

        SearchEvent mockEntity = new SearchEvent();
        mockEntity.eventId = eventId;

        when(repository.findByEventId(eventId)).thenReturn(mockEntity);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        assertFalse(mockEntity.isFull);
    }

    @Test
    @Transactional
    void testEventIndexConsume_MissingEventData() throws Exception {
        message.setEvent(null);
        String json = objectMapper.writeValueAsString(message);

        assertDoesNotThrow(() -> consumer.eventIndexConsume(json));
    }
}
