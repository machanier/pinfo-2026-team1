package ch.unige.pinfo.event.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import com.fasterxml.jackson.databind.ObjectMapper;
import ch.unige.pinfo.event.repository.EventRepository;
import ch.unige.pinfo.event.repository.EventRegistrationRepository;
import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.model.RegistrationStatus;
import ch.unige.pinfo.event.dto.CapacityInfoDTO;
import ch.unige.pinfo.event.dto.EligibilityRuleDTO;

import java.util.UUID;
import java.util.Optional;

@ApplicationScoped
public class EventInternalService {

    @Inject
    EventRepository eventRepository;

    @Inject
    EventRegistrationRepository eventRegistrationRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Event getEventById(UUID eventId) {
        Optional<Event> event = eventRepository.findByEventId(eventId);
        return event.orElse(null);
    }

    public EligibilityRuleDTO parseRestrictedTo(Event event) {
        if (event.getRestrictedToJson() == null || event.getRestrictedToJson().isEmpty()) {
            return null;
        }

        try {
            return objectMapper.readValue(event.getRestrictedToJson(), EligibilityRuleDTO.class);
        } catch (Exception e) {
            System.err.println("Failed to parse restrictedTo: " + e.getMessage());
            return null;
        }
    }

    public CapacityInfoDTO getCapacity(UUID eventId) {
        Optional<Event> event = eventRepository.findByEventId(eventId);

        if (event.isEmpty()) {
            return null;
        }

        Event e = event.get();

        // Count CONFIRMED registrations only
        long confirmedCount = eventRegistrationRepository.countByEventIdAndStatus(eventId,
                RegistrationStatus.CONFIRMED);

        return new CapacityInfoDTO(
                e.getEventId(),
                e.getCapacity(),
                (int) confirmedCount);
    }
}