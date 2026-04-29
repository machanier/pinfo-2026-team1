package ch.unige.pinfo.moderation.messaging;

import java.util.UUID;

public class EventCreatedMessage {
    public UUID eventId;
    public UUID organizerId;
    public String title;
    public String description;
    public String announcementText; // nullable, for announcements
}