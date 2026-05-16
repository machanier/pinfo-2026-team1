package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.EventDto;
import ch.unige.pinfo.search.dto.KafkaEventMessage;
import ch.unige.pinfo.search.model.SearchEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@QuarkusTest
public class EventIndexingConsumerTest {

    @Inject
    EventIndexingConsumer consumer;

    @Inject
    ObjectMapper objectMapper;

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

    @AfterEach
    void tearDown() {
        PanacheMock.reset();
    }

    @Test
    void testEventIndexConsume_UpsertNew() throws Exception {
        PanacheMock.mock(SearchEvent.class);

        SearchEvent mockEntity = new SearchEvent();
        mockEntity.eventId = eventId;
        mockEntity.persist();

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        PanacheMock.verify(SearchEvent.class).findById(eventId);
    }

    @Test
    void testEventIndexConsume_DeleteAction() throws Exception {
        PanacheMock.mock(SearchEvent.class);
        message.setAction("DELETED");

        // Simuler un retour true pour couvrir la branche du LOG.info de suppression
        when(SearchEvent.deleteById(eventId)).thenReturn(true);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        PanacheMock.verify(SearchEvent.class).deleteById(eventId);
    }

    @Test
    void testEventIndexConsume_IsFullLogic() throws Exception {
        PanacheMock.mock(SearchEvent.class);

        message.getEvent().setCapacity(10);
        message.getEvent().setRegisteredCount(10);

        SearchEvent mockEntity = spy(new SearchEvent());
        doNothing().when(mockEntity).persist(); // Évite le plantage interne
        when(SearchEvent.findById(eventId)).thenReturn(mockEntity);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        assertTrue(mockEntity.isFull);
    }

    @Test
    void testEventIndexConsume_InvalidJson() {
        // Validation que le bloc catch s'exécute correctement sans propager d'erreur
        assertDoesNotThrow(() -> consumer.eventIndexConsume("invalid-json"));
    }

    @Test
    void testEventIndexConsume_DeleteAction_NotFound() throws Exception {
        PanacheMock.mock(SearchEvent.class);
        message.setAction("DELETED");
        when(SearchEvent.deleteById(eventId)).thenReturn(false);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        PanacheMock.verify(SearchEvent.class).deleteById(eventId);
    }

    @Test
    void testEventIndexConsume_UpsertExisting() throws Exception {
        PanacheMock.mock(SearchEvent.class);

        SearchEvent existing = spy(new SearchEvent());
        existing.eventId = eventId;
        doNothing().when(existing).persist(); // Sécurise la persistance simulée
        when(SearchEvent.findById(eventId)).thenReturn(existing);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        PanacheMock.verify(SearchEvent.class).findById(eventId);
    }

    @Test
    void testEventIndexConsume_NullCapacity() throws Exception {
        PanacheMock.mock(SearchEvent.class);
        message.getEvent().setCapacity(null);

        SearchEvent mockEntity = spy(new SearchEvent());
        doNothing().when(mockEntity).persist();
        when(SearchEvent.findById(eventId)).thenReturn(mockEntity);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        assertFalse(mockEntity.isFull);
    }

    @Test
    void testEventIndexConsume_MissingEventData() throws Exception {
        // Couvre la branche de validation "Message Kafka reçu sans données d'événement
        // valides"
        message.setEvent(null);
        String json = objectMapper.writeValueAsString(message);

        assertDoesNotThrow(() -> consumer.eventIndexConsume(json));
    }
}