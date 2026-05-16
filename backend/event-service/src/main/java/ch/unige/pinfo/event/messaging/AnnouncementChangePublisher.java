package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.Announcement;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import io.quarkus.logging.Log;

@ApplicationScoped
public class AnnouncementChangePublisher {

    @Inject
    @Channel("announcement-posted")
    Emitter<String> announcementEmitter;

    @Inject
    @Channel("announcement-submitted")
    Emitter<String> announcementSubmittedEmitter;

    @Inject
    ObjectMapper objectMapper;

    /**
     * Publishes an announcement.posted message with relevant details.
     */
    public void announcementPosted(Announcement announcement) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("announcementId", announcement.announcementId);
            payload.put("eventId", announcement.eventId);
            payload.put("organizerId", announcement.organizerId);
            payload.put("postedAt", announcement.postedAt);
            payload.put("body", announcement.body);
            payload.put("eventType", "POSTED");

            announcementEmitter.send(objectMapper.writeValueAsString(payload));
            Log.infof("Kafka published: announcement.posted [announcementId=%s]", announcement.announcementId);
        } catch (Exception e) {
            Log.errorf("Failed to publish announcement.posted [announcementId=%s]: %s", announcement.announcementId,
                    e.getMessage());
        }
    }

    /**
     * Publishes an announcement.submitted message for moderation screening.
     */
    public void announcementSubmitted(Announcement announcement) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("announcementId", announcement.announcementId);
            payload.put("eventId", announcement.eventId);
            payload.put("organizerId", announcement.organizerId);
            payload.put("body", announcement.body);
            payload.put("eventType", "SUBMITTED");

            announcementSubmittedEmitter.send(objectMapper.writeValueAsString(payload));
            Log.infof("Kafka published: announcement.submitted [announcementId=%s]", announcement.announcementId);
        } catch (Exception e) {
            Log.errorf("Failed to publish announcement.submitted [announcementId=%s]: %s",
                    announcement.announcementId, e.getMessage());
        }
    }

}
