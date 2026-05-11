package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.EligibilityRuleDto;
import ch.unige.pinfo.search.dto.KafkaEventMessage;
import ch.unige.pinfo.search.model.SearchEvent;
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

    @Incoming("events")
    @Transactional
    public void eventIndexConsume(String messageJson) {
        try {
            KafkaEventMessage kafkaMsg = objectMapper.readValue(messageJson, KafkaEventMessage.class);

            if (kafkaMsg.getEvent() == null || kafkaMsg.getEvent().getEventId() == null) {
                LOG.warn("Message Kafka reçu sans données d'événement valides");
                return;
            }

            // 1. Gestion de la suppression
            if ("CANCELLED".equalsIgnoreCase(kafkaMsg.getAction())
                    || "DELETED".equalsIgnoreCase(kafkaMsg.getAction())) {
                boolean deleted = SearchEvent.deleteById(kafkaMsg.getEvent().getEventId());
                if (deleted) {
                    LOG.info("Événement supprimé de l'index : " + kafkaMsg.getEvent().getEventId());
                }
                return;
            }

            // 2. Récupération ou création de l'entité (Upsert)
            SearchEvent entity = SearchEvent.findById(kafkaMsg.getEvent().getEventId());
            if (entity == null) {
                entity = new SearchEvent();
                entity.eventId = kafkaMsg.getEvent().getEventId();
            }

            // 3. Mapping des données du DTO vers l'entité
            mapDtoToEntity(kafkaMsg.getEvent(), entity);

            // 4. Persistence
            entity.persist();
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