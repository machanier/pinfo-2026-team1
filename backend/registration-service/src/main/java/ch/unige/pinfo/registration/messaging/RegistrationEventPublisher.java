package ch.unige.pinfo.registration.messaging;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
            Map<String, Object> data = new HashMap<>();
            data.put("registrationId", registrationId);
            data.put("eventId", eventId);
            data.put("studentId", studentId);
            String payload = objectMapper.writeValueAsString(data);
            confirmedEmitter.send(payload);
            System.out.println("=== KAFKA: registration.confirmed published ===");
        } catch (Exception e) {
            System.err.println("Failed to publish registration.confirmed: " + e.getMessage());
        }
    }

    public void publishWaitlisted(UUID registrationId, UUID eventId, String studentId, int position) {
        try {
            Map<String, Object> dataWait = new HashMap<>();
            dataWait.put("registrationId", registrationId);
            dataWait.put("eventId", eventId);
            dataWait.put("studentId", studentId);
            dataWait.put("waitlistPosition", position);
            String payloadWait = objectMapper.writeValueAsString(dataWait);
            waitlistedEmitter.send(payloadWait);
            System.out.println("=== KAFKA: registration.waitlisted published ===");
        } catch (Exception e) {
            System.err.println("Failed to publish registration.waitlisted: " + e.getMessage());
        }
    }

    public void publishCancelled(UUID registrationId, UUID eventId, List<String> waitlistedStudentIds,
            int availableSlots) {
        try {
            Map<String, Object> dataWait = new HashMap<>();
            dataWait.put("registrationId", registrationId);
            dataWait.put("eventId", eventId);
            dataWait.put("waitlistedStudentIds", waitlistedStudentIds);
            dataWait.put("availableSlots", availableSlots);
            String payloadWait = objectMapper.writeValueAsString(dataWait);
            cancelledEmitter.send(payloadWait);
            System.out.println("=== KAFKA: registration.cancelled published ===");
        } catch (Exception e) {
            System.err.println("Failed to publish registration.cancelled: " + e.getMessage());
        }
    }
}