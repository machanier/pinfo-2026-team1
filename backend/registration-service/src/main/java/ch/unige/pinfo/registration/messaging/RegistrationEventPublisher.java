package ch.unige.pinfo.registration.messaging;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class RegistrationEventPublisher {

    @Inject
    @Channel("registration-confirmed")
    Emitter<String> confirmedEmitter;

    @Inject
    @Channel("registration-waitlisted")
    Emitter<String> waitlistedEmitter;

    @Inject
    @Channel("registration-cancelled")
    Emitter<String> cancelledEmitter;

    @Inject
    ObjectMapper objectMapper;

    public void publishConfirmed(UUID registrationId, UUID eventId, String studentId) {
        try {
            String payload = objectMapper.writeValueAsString(new java.util.HashMap<>() {
                {
                    put("registrationId", registrationId);
                    put("eventId", eventId);
                    put("studentId", studentId);
                }
            });
            confirmedEmitter.send(payload);
            System.out.println("=== KAFKA: registration.confirmed published ===");
        } catch (Exception e) {
            System.err.println("Failed to publish registration.confirmed: " + e.getMessage());
        }
    }

    public void publishWaitlisted(UUID registrationId, UUID eventId, String studentId, int position) {
        try {
            String payload = objectMapper.writeValueAsString(new java.util.HashMap<>() {
                {
                    put("registrationId", registrationId);
                    put("eventId", eventId);
                    put("studentId", studentId);
                    put("waitlistPosition", position);
                }
            });
            waitlistedEmitter.send(payload);
            System.out.println("=== KAFKA: registration.waitlisted published ===");
        } catch (Exception e) {
            System.err.println("Failed to publish registration.waitlisted: " + e.getMessage());
        }
    }

    public void publishCancelled(UUID registrationId, UUID eventId, List<String> waitlistedStudentIds,
            int availableSlots) {
        try {
            String payload = objectMapper.writeValueAsString(new java.util.HashMap<>() {
                {
                    put("registrationId", registrationId);
                    put("eventId", eventId);
                    put("waitlistedStudentIds", waitlistedStudentIds);
                    put("availableSlots", availableSlots);
                }
            });
            cancelledEmitter.send(payload);
            System.out.println("=== KAFKA: registration.cancelled published ===");
        } catch (Exception e) {
            System.err.println("Failed to publish registration.cancelled: " + e.getMessage());
        }
    }
}