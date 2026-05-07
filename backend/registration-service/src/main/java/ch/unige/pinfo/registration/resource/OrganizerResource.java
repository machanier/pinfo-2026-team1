package ch.unige.pinfo.registration.resource;

import ch.unige.pinfo.registration.client.EventServiceClient;
import ch.unige.pinfo.registration.dto.EventDto;
import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.api.OrganizerApi;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStats;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class OrganizerResource implements OrganizerApi {

    @Inject
    @RestClient
    EventServiceClient eventServiceClient;

    @Inject
    JsonWebToken jwt;

    @Override
    public RegistrationPage apiEventsEventIdRegistrationsGet(UUID eventId, RegistrationStatus status, Integer page,
            Integer size) {
        // 1. Ownership Guard : Vérifier si l'utilisateur est l'organisateur
        checkOrganizerOwnership(eventId);

        // 2. Préparation de la requête avec filtre optionnel sur le statut
        PanacheQuery<Registration> query;
        if (status != null) {
            // On utilise .name() car le statut en base est stocké en Ordinal ou String
            query = Registration.find("eventId = ?1 and status = ?2", eventId, status);
        } else {
            query = Registration.find("eventId = ?1", eventId);
        }

        // 3. Application de la pagination
        query.page(Page.of(page, size));
        List<Registration> entities = query.list();
        long totalItems = query.count();

        // 4. Construction de la réponse paginée
        RegistrationPage responsePage = new RegistrationPage();
        responsePage.setContent(entities.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList()));

        responsePage.setTotalElements((int) totalItems);
        responsePage.setPage(page);
        responsePage.setSize(size);
        responsePage.setTotalPages((int) Math.ceil((double) totalItems / size));

        return responsePage;
    }

    @Override
    public RegistrationResponse apiEventsEventIdRegistrationsRegistrationIdConfirmPatch(UUID eventId,
            UUID registrationId) {
        checkOrganizerOwnership(eventId);
        throw new UnsupportedOperationException("La confirmation manuelle n'est pas encore implémentée.");
    }

    @Override
    public RegistrationStats apiEventsEventIdRegistrationsStatsGet(UUID eventId) {
        checkOrganizerOwnership(eventId);

        // Compter par status
        long confirmed = Registration.count("eventId = ?1 and status = ?2", eventId, RegistrationStatus.CONFIRMED);
        long pending = Registration.count("eventId = ?1 and status = ?2", eventId, RegistrationStatus.PENDING);
        long waitlisted = Registration.count("eventId = ?1 and status = ?2", eventId, RegistrationStatus.WAITLISTED);
        long cancelled = Registration.count("eventId = ?1 and status = ?2", eventId, RegistrationStatus.CANCELLED);

        // Récupérer la capacité depuis l'event-service
        EventDto event = eventServiceClient.getEvent(eventId);
        Integer capacity = event.getCapacity();

        Integer availableSlots = null;
        if (capacity != null) {
            availableSlots = capacity - (int) confirmed - (int) pending;
            if (availableSlots < 0)
                availableSlots = 0;
        }

        RegistrationStats stats = new RegistrationStats();
        stats.setEventId(eventId);
        stats.setCapacity(capacity);
        stats.setConfirmed((int) confirmed);
        stats.setPending((int) pending);
        stats.setWaitlisted((int) waitlisted);
        stats.setCancelled((int) cancelled);
        stats.setAvailableSlots(availableSlots);

        return stats;
    }

    private void checkOrganizerOwnership(UUID eventId) {
        EventDto event = eventServiceClient.getEvent(eventId);

        if (event == null) {
            throw new NotFoundException("Événement non trouvé.");
        }

        String currentUserId = jwt.getSubject();
        if (currentUserId == null || !event.getOrganizerId().equals(currentUserId)) {
            throw new ForbiddenException("Accès refusé : Vous n'êtes pas l'organisateur de cet événement.");
        }
    }

    private RegistrationResponse mapToResponse(Registration entity) {
        RegistrationResponse response = new RegistrationResponse();
        response.setRegistrationId(entity.getRegistrationId());
        response.setEventId(entity.getEventId());
        response.setStudentId(entity.getStudentId());

        // Conversion de l'Enum interne vers l'Enum OpenAPI
        if (entity.getStatus() != null) {
            response.setStatus(RegistrationStatus.valueOf(entity.getStatus().name()));
        }

        return response;
    }
}