package ch.unige.pinfo.moderation.messaging;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

// Ignore all other fields contained in the JSON returned by event service
// as defined in EventChangePublisher, since they aren't relevant to moderation
@JsonIgnoreProperties(ignoreUnknown = true)
public class EventCreatedMessage {
    public UUID eventId;
    public UUID organizerId;
    public String title;
    public String description;
    public String announcementText; // nullable, for announcements
}