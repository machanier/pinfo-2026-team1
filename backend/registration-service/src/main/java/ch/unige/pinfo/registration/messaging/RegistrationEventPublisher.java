package ch.unige.pinfo.registration.messaging;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class RegistrationEventPublisher {

    private static final Logger LOG = Logger.getLogger(RegistrationEventPublisher.class);

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

    public void publishConfirmed(UUID registrationId, UUID eventId, UUID studentId) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("registrationId", registrationId);
            data.put("eventId", eventId);
            data.put("studentId", studentId);
            String payload = objectMapper.writeValueAsString(data);
            confirmedEmitter.send(payload);
            LOG.debugf("Kafka publish OK: registration.confirmed for registrationId=%s", registrationId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to publish registration.confirmed for registrationId=%s", registrationId);
        }
    }

    public void publishWaitlisted(UUID registrationId, UUID eventId, UUID studentId, int position) {
        try {
            Map<String, Object> dataWait = new HashMap<>();
            dataWait.put("registrationId", registrationId);
            dataWait.put("eventId", eventId);
            dataWait.put("studentId", studentId);
            dataWait.put("waitlistPosition", position);
            String payloadWait = objectMapper.writeValueAsString(dataWait);
            waitlistedEmitter.send(payloadWait);
            LOG.debugf("Kafka publish OK: registration.waitlisted for registrationId=%s", registrationId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to publish registration.waitlisted for registrationId=%s", registrationId);
        }
    }

    public void publishCancelled(UUID registrationId, UUID eventId, List<UUID> waitlistedStudentIds,
            int availableSlots) {
        try {
            Map<String, Object> dataWait = new HashMap<>();
            dataWait.put("registrationId", registrationId);
            dataWait.put("eventId", eventId);
            dataWait.put("waitlistedStudentIds", waitlistedStudentIds);
            dataWait.put("availableSlots", availableSlots);
            String payloadWait = objectMapper.writeValueAsString(dataWait);
            cancelledEmitter.send(payloadWait);
            LOG.debugf("Kafka publish OK: registration.cancelled for registrationId=%s", registrationId);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to publish registration.cancelled for registrationId=%s", registrationId);
        }
    }
}
