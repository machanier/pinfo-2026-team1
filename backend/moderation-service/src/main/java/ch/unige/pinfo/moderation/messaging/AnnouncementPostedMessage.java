package ch.unige.pinfo.moderation.messaging;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AnnouncementPostedMessage {
    public UUID announcementId;
    public UUID eventId;
    public UUID organizerId;
    public String body;
}
