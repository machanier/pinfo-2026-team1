package ch.unige.pinfo.registration.messaging;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import com.fasterxml.jackson.databind.ObjectMapper;
import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class EventCancelledConsumer {

    @Inject
    ObjectMapper objectMapper;

    @Incoming("event-cancelled")
    @Transactional
    public void onEventCancelled(String message) {
        try {
            System.out.println("=== KAFKA: event.cancelled received ===");
            System.out.println("Message: " + message);

            // Parse le message pour récupérer l'eventId
            var payload = objectMapper.readTree(message);
            UUID eventId = UUID.fromString(payload.get("eventId").asText());

            // Récupérer toutes les registrations CONFIRMED et WAITLISTED
            List<Registration> toCancel = Registration.find(
                    "eventId = ?1 and (status = ?2 or status = ?3)",
                    eventId,
                    RegistrationStatus.CONFIRMED,
                    RegistrationStatus.WAITLISTED).list();

            System.out.println("=== Cancelling " + toCancel.size() + " registrations for event " + eventId + " ===");

            // Bulk update
            toCancel.forEach(r -> {
                r.setStatus(RegistrationStatus.CANCELLED);
                r.persist();
            });

            System.out.println("=== Done cancelling registrations ===");

        } catch (Exception e) {
            System.err.println("Failed to process event.cancelled: " + e.getMessage());
        }
    }
}