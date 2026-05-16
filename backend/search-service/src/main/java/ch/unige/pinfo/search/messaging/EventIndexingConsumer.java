package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.EligibilityRuleDto;
import ch.unige.pinfo.search.dto.KafkaEventMessage;
import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.repository.SearchEventRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.UUID;

import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EventIndexingConsumer {

    private static final Logger LOG = Logger.getLogger(EventIndexingConsumer.class);

    @Inject
    ObjectMapper objectMapper;

    @Inject
    SearchEventRepository repository;

    @Incoming("events")
    @Transactional
    public void eventIndexConsume(String messageJson) {
        try {
            KafkaEventMessage kafkaMsg = objectMapper.readValue(messageJson, KafkaEventMessage.class);

            if (kafkaMsg.getEvent() == null || kafkaMsg.getEvent().getEventId() == null) {
                LOG.warn("Message Kafka reçu sans données d'événement valides");
                return;
            }

            // Use repository instead of static methods
            if ("CANCELLED".equalsIgnoreCase(kafkaMsg.getAction())
                    || "DELETED".equalsIgnoreCase(kafkaMsg.getAction())) {
                boolean deleted = repository.deleteByEventId(kafkaMsg.getEvent().getEventId());
                if (deleted) {
                    LOG.info("Événement supprimé de l'index : " + kafkaMsg.getEvent().getEventId());
                }
                return;
            }

            SearchEvent entity = repository.findByEventId(kafkaMsg.getEvent().getEventId());
            if (entity == null) {
                entity = new SearchEvent();
                entity.eventId = kafkaMsg.getEvent().getEventId();
            }

            mapDtoToEntity(kafkaMsg.getEvent(), entity);
            repository.persist(entity); // Use repository
            LOG.info("Événement indexé/mis à jour : " + entity.title);

        } catch (Exception e) {
            LOG.error("Erreur critique lors de l'indexation Kafka", e);
        }
    }

    private void mapDtoToEntity(ch.unige.pinfo.search.dto.EventDto dto, SearchEvent entity) {
        entity.title = dto.getTitle();
        entity.description = dto.getDescription();
        entity.place = dto.getPlace();
        entity.time = dto.getTime();
        entity.endTime = dto.getEndTime();
        entity.category = dto.getCategory();
        entity.tags = dto.getTags();
        entity.organizerId = UUID.fromString(dto.getOrganizerId()); // Conversion si nécessaire
        entity.organizerName = dto.getOrganizerName();
        entity.capacity = dto.getCapacity();
        entity.registeredCount = dto.getRegisteredCount();

        // Calcul automatique du flag isFull
        if (dto.getCapacity() != null && dto.getRegisteredCount() != null) {
            entity.isFull = dto.getRegisteredCount() >= dto.getCapacity();
        } else {
            entity.isFull = false;
        }

        // Mapping des règles d'éligibilité
        if (dto.getRestrictedTo() != null) {
            entity.eligibleFaculties = dto.getRestrictedTo().getFaculties();
            entity.eligibleDegreeLevels = dto.getRestrictedTo().getDegreeLevels().stream()
                    .map(EligibilityRuleDto.DegreeLevelsEnum::getValue)
                    .toList();
        }
    }
}