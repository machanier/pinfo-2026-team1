package ch.unige.pinfo.notification.client;

import java.time.OffsetDateTime;
import java.util.UUID;

public class EventCalendarEntry {
    public UUID eventId;
    public String title;
    public String place;
    public OffsetDateTime time;
    public OffsetDateTime endTime;
}
