package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.service.AnnouncementService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.UUID;

@ApplicationScoped
public class AnnouncementModeratedConsumer {

    private static final Logger LOG = Logger.getLogger(AnnouncementModeratedConsumer.class);

    @Inject
    AnnouncementService announcementService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("announcement-moderated")
    public void onAnnouncementModerated(String rawMessage) {
        try {
            JsonNode payload = objectMapper.readTree(rawMessage);
            UUID announcementId = UUID.fromString(payload.get("announcementId").asText());
            String status = payload.get("status").asText();

            announcementService.applyModerationDecision(announcementId, status);
            LOG.infof("Consumed announcement.moderated [announcementId=%s, status=%s]", announcementId, status);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to process announcement.moderated message");
        }
    }
}
