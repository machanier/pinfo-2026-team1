package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.service.ModerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AnnouncementPostedConsumer {

    private static final Logger LOG = Logger.getLogger(AnnouncementPostedConsumer.class);

    @Inject
    ModerationService moderationService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("announcement-submitted")
    @Blocking
    public void onAnnouncementPosted(String rawMessage) {
        try {
            AnnouncementPostedMessage announcement = objectMapper.readValue(rawMessage,
                    AnnouncementPostedMessage.class);
            LOG.infof("Received announcement.submitted for announcementId=%s eventId=%s",
                    announcement.announcementId, announcement.eventId);
            moderationService.screenAnnouncement(announcement);
        } catch (Exception e) {
            LOG.errorf("Failed to process announcement.submitted message: %s", e.getMessage());
        }
    }
}
