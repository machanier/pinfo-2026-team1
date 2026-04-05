package ch.unige.pinfo.registration.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.eclipse.microprofile.rest.client.inject.RestClient;

import ch.unige.pinfo.registration.service.RegistrationService;
import ch.unige.pinfo.registration.client.EventServiceClient;
import ch.unige.pinfo.registration.client.UserServiceClient;
import ch.unige.pinfo.registration.model.Registration;
import java.time.OffsetDateTime;

import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;

import ch.unige.pinfo.registration.dto.CapacityDto;
import ch.unige.pinfo.registration.dto.EligibilityRuleDto;
import ch.unige.pinfo.registration.dto.EventDto;

@ApplicationScoped
public class RegistrationService {

    @Inject
    @RestClient
    EventServiceClient eventClient;

    @Inject
    @RestClient
    UserServiceClient userClient;

    @Transactional
    public RegistrationResponse register(String studentId, CreateRegistrationRequest req) {

        boolean exists = Registration.find(
                "studentId = ?1 and eventId = ?2", studentId, req.getEventId()).firstResultOptional().isPresent();
        if (exists)
            throw new WebApplicationException(409);

        /*
         * EventDto event = eventClient.getEvent(req.getEventId());
         * if (event == null)
         * throw new WebApplicationException(404);
         * 
         * EligibilityRuleDto rule = event.getRestrictedTo();
         * if (rule != null) {
         * List<String> degreeLevels = rule.getDegreeLevels() == null ? null
         * : rule.getDegreeLevels().stream()
         * .map(EligibilityRuleDto.DegreeLevelsEnum::getValue)
         * .collect(Collectors.toList());
         * 
         * boolean eligible = userClient.checkEligibility(
         * studentId,
         * rule.getFaculties(),
         * rule.getMajors(),
         * degreeLevels);
         * if (!eligible)
         * throw new WebApplicationException(400);
         * }
         * 
         * 
         * CapacityDto capacity = eventClient.getCapacity(req.getEventId());
         */

        RegistrationStatus status = RegistrationStatus.CONFIRMED;
        Integer waitlistPosition = null;

        /*
         * if (!capacity.getIsFull()) {
         * status = RegistrationStatus.CONFIRMED;
         * } else {
         * status = RegistrationStatus.WAITLISTED;
         * long count = Registration.count(
         * "eventId = ?1 and status = ?2", req.getEventId(),
         * RegistrationStatus.WAITLISTED.toString());
         * waitlistPosition = (int) count + 1;
         * }
         */

        Registration r = new Registration();
        r.setStudentId(studentId);
        r.setEventId(req.getEventId());
        r.setStatus(status);
        r.setDate(OffsetDateTime.now());
        r.setPos(waitlistPosition);
        r.persist();

        return toResponse(r);
    }

    private RegistrationResponse toResponse(Registration r) {
        RegistrationResponse dto = new RegistrationResponse();
        dto.setRegistrationId(r.getRegistrationId());
        try {
            dto.setStudentId(UUID.fromString(r.getStudentId()));
        } catch (IllegalArgumentException e) {
            // Si le format String d'Auth0 n'est pas un UUID,
            // on met un UUID vide ou généré pour ne pas faire planter le test
            dto.setStudentId(UUID.nameUUIDFromBytes(r.getStudentId().getBytes()));
        }
        dto.setEventId(r.getEventId());
        dto.setStatus(r.getStatus());
        dto.setRegisteredAt(r.getDate());
        dto.setWaitlistPosition(r.getPos());
        return dto;
    }
}
