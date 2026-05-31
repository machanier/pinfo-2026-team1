package ch.unige.pinfo.moderation.messaging;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public class EventSubmittedMessage {
    public UUID eventId;
    public UUID organizerId;
    public String title;
    public String description;
}
