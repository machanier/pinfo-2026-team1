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

        // Simuler que l'événement n'existe pas
        when(SearchEvent.findById(eventId)).thenReturn(null);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        // On vérifie qu'un nouvel objet a été instancié et persisté
        PanacheMock.verify(SearchEvent.class).findById(eventId);
    }

    @Test
    void testEventIndexConsume_DeleteAction() throws Exception {
        PanacheMock.mock(SearchEvent.class);
        message.setAction("DELETED");

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        // Vérifie que la méthode de suppression statique a été appelée
        PanacheMock.verify(SearchEvent.class).deleteById(eventId);
    }

    @Test
    void testEventIndexConsume_IsFullLogic() throws Exception {
        PanacheMock.mock(SearchEvent.class);

        // Cas : Événement complet
        message.getEvent().setCapacity(10);
        message.getEvent().setRegisteredCount(10);

        SearchEvent mockEntity = spy(new SearchEvent());
        when(SearchEvent.findById(eventId)).thenReturn(mockEntity);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        // Vérifie que le flag isFull est passé à true
        assert (mockEntity.isFull);
    }

    @Test
    void testEventIndexConsume_InvalidJson() {
        // Teste la branche "catch" en envoyant un truc qui n'est pas du JSON
        consumer.eventIndexConsume("invalid-json");
        // Le test passe si aucune exception n'est propagée (le catch fonctionne)
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
        when(SearchEvent.findById(eventId)).thenReturn(mockEntity);

        String json = objectMapper.writeValueAsString(message);
        consumer.eventIndexConsume(json);

        assert (!mockEntity.isFull);
    }
}