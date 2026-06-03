package ch.unige.pinfo.user.messaging;

import ch.unige.pinfo.user.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;
import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
public class UserEventPublisher {

    private static final Logger LOG = Logger.getLogger(UserEventPublisher.class);

    @Inject
    @Channel("organizer-upsert-out")
    Emitter<String> kafkaEmitter; // On envoie du String (JSON) pour éviter tout conflit de classe

    @Inject
    ObjectMapper objectMapper;

    public void publishOrganizerUpsert(User user) {
        try {
            // On construit dynamiquement le payload pour qu'il corresponde
            // exactement aux clés attendues par le OrganizerDto du Search-Service
            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", user.getId());
            payload.put("associationName", user.getName()); // Le 'name' du User devient l'associationName
            payload.put("description", ""); // Optionnel ou à enrichir si tu as un sous-type Association
            payload.put("logoUrl", user.getAvatarUrl()); // L'avatar devient le logoUrl
            payload.put("verified", true);
            payload.put("upcomingEventCount", 0);

            String jsonPayload = objectMapper.writeValueAsString(payload);
            kafkaEmitter.send(jsonPayload);

            LOG.infof("Événement de synchronisation d'organisateur envoyé pour l'ID: %s", user.getId());
        } catch (Exception e) {
            LOG.error("Impossible de sérialiser le profil de l'organisateur pour Kafka", e);
        }
    }

    public void publishOrganizerUpsertWithId(java.util.UUID userId, String name) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("userId", userId.toString());
            payload.put("associationName", name);
            payload.put("description", "");
            payload.put("logoUrl", "");
            payload.put("verified", true);
            payload.put("upcomingEventCount", 0);

            String jsonPayload = objectMapper.writeValueAsString(payload);
            kafkaEmitter.send(jsonPayload);
            LOG.infof("Événement organisateur envoyé pour l'ID déterministe: %s", userId);
        } catch (Exception e) {
            LOG.error("Impossible de publier le profil organisateur", e);
        }
    }
}