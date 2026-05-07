package ch.unige.pinfo.registration.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.eclipse.microprofile.rest.client.inject.RestClient;

import ch.unige.pinfo.registration.client.EventServiceClient;
import ch.unige.pinfo.registration.client.UserServiceClient;
import ch.unige.pinfo.registration.model.Registration;
import java.time.OffsetDateTime;

import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import ch.unige.pinfo.registration.dto.CapacityDto;
import ch.unige.pinfo.registration.dto.EligibilityRuleDto;
import ch.unige.pinfo.registration.dto.EventDto;
import ch.unige.pinfo.registration.messaging.RegistrationEventPublisher;
import ch.unige.pinfo.registration.dto.EligibilityAttributesDTO;

@ApplicationScoped
public class RegistrationService {

    @Inject
    @RestClient
    EventServiceClient eventClient;

    @Inject
    @RestClient
    UserServiceClient userClient;

    @Inject
    RegistrationEventPublisher eventPublisher;

    @Transactional
    public RegistrationResponse register(String studentId, CreateRegistrationRequest req) {

        // 1. Check if already registered
        boolean exists = Registration.find(
                "studentId = ?1 and eventId = ?2", studentId, req.getEventId()).firstResultOptional().isPresent();
        if (exists)
            throw new WebApplicationException(409);

        // 2. Get event and verify it's PUBLISHED
        EventDto event;
        try {
            event = eventClient.getEvent(req.getEventId());

            // Sécurité supplémentaire si le client est configuré pour retourner null au
            // lieu d'une exception
            if (event == null) {
                throw new WebApplicationException("Événement introuvable", Response.Status.NOT_FOUND);
            }
        } catch (jakarta.ws.rs.WebApplicationException e) {
            // Si le EventService a répondu 404, on propage un 404 propre
            if (e.getResponse().getStatus() == 404) {
                throw new WebApplicationException("Événement inexistant dans le catalogue", Response.Status.NOT_FOUND);
            }
            // Si c'est une autre erreur (500, 503...), on la laisse remonter
            throw e;
        }

        // Vérification du statut
        if (!"PUBLISHED".equals(event.getStatus())) {
            throw new WebApplicationException("L'événement n'est pas encore ouvert aux inscriptions",
                    Response.Status.BAD_REQUEST);
        }

        System.out.println("=== EVENT FOUND ===");
        System.out.println("Event: " + event.getEventId());
        System.out.println("Status: " + event.getStatus());

        // 3. Check eligibility if event has restrictions
        EligibilityRuleDto rule = event.getRestrictedTo();

        if (rule != null) {
            System.out.println("=== ELIGIBILITY RULES DETECTED ===");

            // Appel au User Service pour récupérer le profil de l'étudiant
            EligibilityAttributesDTO userAttrs = userClient.checkEligibility(studentId);

            if (userAttrs == null) {
                System.out.println("Eligibility failed: User profile not found for " + studentId);
                throw new WebApplicationException("User profile not found", Response.Status.NOT_FOUND);
            }

            // Comparaison Faculté
            boolean facultyOk = rule.getFaculties() == null || rule.getFaculties().isEmpty() ||
                    rule.getFaculties().contains(userAttrs.getFaculty());

            // Comparaison Major
            boolean majorOk = rule.getMajors() == null || rule.getMajors().isEmpty() ||
                    rule.getMajors().contains(userAttrs.getMajor());

            // Comparaison Degree Level
            boolean degreeOk = rule.getDegreeLevels() == null || rule.getDegreeLevels().isEmpty() ||
                    rule.getDegreeLevels().stream()
                            .anyMatch(d -> d.getValue().equals(userAttrs.getDegreeLevel()));

            System.out.println("=== ELIGIBILITY RESULTS ===");
            System.out.println("Student: " + studentId);
            System.out.println("Faculty OK: " + facultyOk + " (User: " + userAttrs.getFaculty() + ")");
            System.out.println("Major OK: " + majorOk + " (User: " + userAttrs.getMajor() + ")");
            System.out.println("Degree OK: " + degreeOk + " (User: " + userAttrs.getDegreeLevel() + ")");

            if (!facultyOk || !majorOk || !degreeOk) {
                throw new WebApplicationException("User does not meet eligibility criteria", Response.Status.FORBIDDEN);
            }
        }

        // 4. Check capacity
        CapacityDto capacity = eventClient.getCapacity(req.getEventId());
        System.out.println("=== CAPACITY CHECK ===");
        System.out.println("capacity: " + capacity.getCapacity());
        System.out.println("registered: " + capacity.getRegisteredCount());
        System.out.println("available: " + capacity.getAvailableSlots());
        System.out.println("isFull: " + capacity.getIsFull());

        // 5. Determine registration status based on capacity
        RegistrationStatus status = RegistrationStatus.CONFIRMED;
        Integer waitlistPosition = null;

        if (capacity.getIsFull()) {
            status = RegistrationStatus.WAITLISTED;
            long count = Registration.count(
                    "eventId = ?1 and status = ?2", req.getEventId(),
                    RegistrationStatus.WAITLISTED);
            waitlistPosition = (int) count + 1;

            System.out.println("=== WAITLIST ===");
            System.out.println("Event is full, adding to waitlist at position: " + waitlistPosition);
        } else {
            System.out.println("=== CONFIRMED ===");
            System.out.println("Registration confirmed");
        }

        // 6. Create registration
        Registration r = new Registration();
        r.setStudentId(studentId);
        r.setEventId(req.getEventId());
        r.setStatus(status);
        r.setDate(OffsetDateTime.now());
        r.setPos(waitlistPosition);
        r.persist();

        // 7. Publish Kafka event
        if (status == RegistrationStatus.CONFIRMED) {
            eventPublisher.publishConfirmed(r.getRegistrationId(), r.getEventId(), r.getStudentId());
        } else {
            eventPublisher.publishWaitlisted(r.getRegistrationId(), r.getEventId(), r.getStudentId(), waitlistPosition);
        }

        return toResponse(r);
    }

    private RegistrationResponse toResponse(Registration r) {
        RegistrationResponse dto = new RegistrationResponse();
        dto.setRegistrationId(r.getRegistrationId());
        try {
            dto.setStudentId(r.getStudentId());
        } catch (IllegalArgumentException e) {
            // Support pour les IDs Auth0 qui ne sont pas des UUIDs standards
            dto.setStudentId(r.getStudentId());
        }
        dto.setEventId(r.getEventId());
        dto.setStatus(r.getStatus());
        dto.setRegisteredAt(r.getDate());
        dto.setWaitlistPosition(r.getPos());
        return dto;
    }

    @Transactional
    public void cancel(UUID registrationId, String studentId) {

        // 1. Trouver la registration
        Registration r = Registration.findById(registrationId);
        if (r == null)
            throw new WebApplicationException(Response.Status.NOT_FOUND);

        // 2. Ownership guard — 403 si pas la sienne
        if (!r.getStudentId().equals(studentId))
            throw new WebApplicationException(Response.Status.FORBIDDEN);

        // 3. Vérifier que l'event n'est pas passé
        EventDto event = eventClient.getEvent(r.getEventId());
        if (event.getTime().isBefore(OffsetDateTime.now()))
            throw new WebApplicationException(Response.Status.CONFLICT);

        // 4. Annuler
        r.setStatus(RegistrationStatus.CANCELLED);
        r.persist();

        CapacityDto capacity = eventClient.getCapacity(r.getEventId());

        // 5. Récupérer les étudiants en waitlist pour Kafka
        List<Registration> waitlisted = Registration.find(
                "eventId = ?1 and status = ?2", r.getEventId(), RegistrationStatus.WAITLISTED).list();

        List<String> waitlistedStudentIds = waitlisted.stream()
                .map(Registration::getStudentId)
                .collect(Collectors.toList());

        int availableSlots = capacity.getCapacity() - (capacity.getRegisteredCount() - 1);

        System.out.println("=== CANCEL ===");
        System.out.println("registrationId: " + registrationId);
        System.out.println("waitlistedStudentIds: " + waitlistedStudentIds);

        eventPublisher.publishCancelled(
                r.getRegistrationId(),
                r.getEventId(),
                waitlistedStudentIds,
                availableSlots);

        System.out.println("=== CANCEL SUCCESS ===");
        System.out.println("Published to Kafka: " + waitlistedStudentIds.size() + " students notified.");
    }

    public RegistrationPage getMyRegistrations(String studentId, RegistrationStatus status, int page, int size) {

        PanacheQuery<Registration> query;

        if (status != null) {
            query = Registration.find(
                    "studentId = ?1 and status = ?2",
                    studentId, status);
        } else {
            query = Registration.find("studentId = ?1", studentId);
        }

        long total = query.count();
        List<Registration> results = query.page(page, size).list();

        RegistrationPage result = new RegistrationPage();
        result.setContent(results.stream().map(this::toResponse).collect(Collectors.toList()));
        result.setPage(page);
        result.setSize(size);
        result.setTotalElements((int) total);
        result.setTotalPages((int) Math.ceil((double) total / size));

        return result;
    }

    public RegistrationResponse getById(UUID registrationId, String studentId) {

        Registration r = Registration.findById(registrationId);
        if (r == null)
            throw new WebApplicationException(Response.Status.NOT_FOUND);

        if (!r.getStudentId().equals(studentId))
            throw new WebApplicationException(Response.Status.FORBIDDEN);

        return toResponse(r);
    }

}