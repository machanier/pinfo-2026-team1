package ch.unige.pinfo.moderation.messaging;

import ch.unige.pinfo.moderation.service.ModerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AnnouncementSubmittedConsumer {

    private static final Logger LOG = Logger.getLogger(AnnouncementSubmittedConsumer.class);

    @Inject
    ModerationService moderationService;

    @Inject
    ObjectMapper objectMapper;

    @Incoming("announcement-submitted")
    @Blocking
        public void onAnnouncementSubmitted(String rawMessage) {
        try {
            AnnouncementSubmittedMessage announcement = objectMapper.readValue(rawMessage,
                AnnouncementSubmittedMessage.class);
            LOG.infof("Received announcement.submitted for announcementId=%s eventId=%s",
                    announcement.announcementId, announcement.eventId);
            moderationService.screenAnnouncement(announcement);
        } catch (Exception e) {
            LOG.errorf("Failed to process announcement.submitted message: %s", e.getMessage());
        }
    }
}
