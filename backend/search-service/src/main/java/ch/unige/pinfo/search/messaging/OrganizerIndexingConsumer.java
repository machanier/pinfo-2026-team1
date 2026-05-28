package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.OrganizerDto;
import ch.unige.pinfo.search.model.SearchOrganizer;
import ch.unige.pinfo.search.repository.OrganizerSearchRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ApplicationScoped
public class OrganizerIndexingConsumer {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizerIndexingConsumer.class);

    @Inject
    OrganizerSearchRepository repository;

    @Inject
    ch.unige.pinfo.search.repository.SearchEventRepository eventRepository;

    /**
     * Consomme les événements de création ou mise à jour des organisateurs.
     * Le nom du canal "organizer-upsert" doit correspondre à votre configuration
     * mp.messaging.incoming
     */
    @Incoming("organizers")
    @Transactional
    public void consumeOrganizerUpsert(OrganizerDto dto) {
        LOG.info("Indexing organizer: {} (ID: {})", dto.getAssociationName(), dto.getUserId());

        try {
            SearchOrganizer entity = repository.findByIdOptional(dto.getUserId())
                    .orElse(new SearchOrganizer());

            entity.userId = dto.getUserId();
            entity.associationName = dto.getAssociationName();
            entity.description = dto.getDescription();
            entity.logoUrl = dto.getLogoUrl();
            entity.verified = dto.isVerified();

            if (dto.getUpcomingEventCount() != null) {
                entity.upcomingEventCount = dto.getUpcomingEventCount();
            }

            repository.persist(entity);

            // 2. AJOUTE CETTE MISE À JOUR GLOBAL POUR DÉNORMALISER LE NOM
            if (dto.getUserId() != null) {
                eventRepository.update("organizerName = ?1 WHERE organizerId = ?2",
                        dto.getAssociationName(), dto.getUserId());
                // Force l'écriture pour que le test E2E l'intercepte immédiatement
                eventRepository.getEntityManager().flush();
            }

        } catch (Exception e) {
            LOG.error("Failed to index organizer ID: {}", dto.getUserId(), e);
        }
    }

    /**
     * Consomme les événements de suppression (si un compte est supprimé)
     */
    @Incoming("organizer-deleted")
    @Transactional
    public void consumeOrganizerDeletion(String userId) {
        LOG.info("Removing organizer from index: {}", userId);
        repository.deleteById(java.util.UUID.fromString(userId));
    }
}