package ch.unige.pinfo.search.dto;

public class KafkaEventMessage {
    private String action;
    private EventDto event;

    public void setEvent(EventDto event) {
        this.event = event;
    }

    public EventDto getEvent() {
        return this.event;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getAction() {
        return this.action;
    }

}
