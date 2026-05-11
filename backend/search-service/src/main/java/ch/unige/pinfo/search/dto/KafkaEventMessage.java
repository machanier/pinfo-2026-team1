package ch.unige.pinfo.search.dto;

public class KafkaEventMessage {
    private String action;
    private EventDto event;

    public EventDto getEvent() {
        return this.event;
    }

    public String getAction() {
        return this.action;
    }

}
