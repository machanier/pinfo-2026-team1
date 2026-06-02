package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.EligibilityRuleDto;
import ch.unige.pinfo.search.dto.KafkaEventMessage;
import ch.unige.pinfo.search.model.SearchEvent;
import ch.unige.pinfo.search.repository.SearchEventRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.nio.charset.StandardCharsets;
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

    @Incoming("event-created")
    @Transactional
    public void onEventCreated(String messageJson) {
        eventIndexConsume(messageJson);
    }

    @Incoming("event-updated")
    @Transactional
    public void onEventUpdated(String messageJson) {
        eventIndexConsume(messageJson);
    }

    @Incoming("event-cancelled")
    @Transactional
    public void onEventCancelled(String messageJson) {
        eventIndexConsume(messageJson);
    }

    public void eventIndexConsume(String messageJson) {
        try {
            KafkaEventMessage kafkaMsg = objectMapper.readValue(messageJson, KafkaEventMessage.class);

            if (kafkaMsg.getEvent() == null || kafkaMsg.getEvent().getEventId() == null) {
                LOG.warn("Message Kafka reçu sans données d'événement valides");
                return;
            }

            String action = kafkaMsg.getAction();
            UUID eventId = kafkaMsg.getEvent().getEventId();

            if ("CANCELLED".equalsIgnoreCase(action) || "DELETED".equalsIgnoreCase(action)) {
                boolean deleted = repository.deleteByEventId(eventId);
                if (deleted) {
                    LOG.info("Événement supprimé de l'index : " + eventId);
                }
                return;
            }

            SearchEvent entity = repository.findByEventId(eventId);
            boolean isNew = false;
            if (entity == null) {
                entity = new SearchEvent();
                entity.eventId = eventId;
                isNew = true;
            }

            mapDtoToEntity(kafkaMsg.getEvent(), entity);

            if (isNew) {
                try {
                    repository.persistAndFlush(entity);
                } catch (jakarta.persistence.PersistenceException e) {
                    // Si un autre thread a inséré l'entité entre-temps
                    LOG.warn("Collision détectée pour l'ID " + eventId + ", tentative de mise à jour.");

                    // On récupère l'entité fraîchement insérée par l'autre thread
                    SearchEvent existingEntity = repository.findByEventId(eventId);
                    if (existingEntity != null) {
                        mapDtoToEntity(kafkaMsg.getEvent(), existingEntity);
                        repository.getEntityManager().flush();
                    } else {
                        throw e; // Si c'était une autre erreur, on propage
                    }
                }
            } else {
                repository.getEntityManager().flush();
            }

            LOG.info("Événement indexé/mis à jour (" + action + ") : " + entity.title);

        } catch (Exception e) {
            LOG.error("Erreur critique lors de l'indexation Kafka", e);
        }
    }

    public void mapDtoToEntity(ch.unige.pinfo.search.dto.EventDto dto, SearchEvent entity) {
        entity.title = dto.getTitle();
        entity.description = dto.getDescription();
        entity.place = dto.getPlace();
        entity.time = dto.getTime();
        entity.endTime = dto.getEndTime();
        entity.category = dto.getCategory();
        entity.tags = dto.getTags();
        entity.organizerName = dto.getOrganizerName();
        entity.capacity = dto.getCapacity();
        entity.registeredCount = dto.getRegisteredCount();

        // Correction sécurisée du parsing UUID pour supporter le format Auth0 test
        // ("auth0|...")
        entity.organizerId = dto.getOrganizerId();

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