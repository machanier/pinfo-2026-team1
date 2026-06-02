package ch.unige.pinfo.search.messaging;

import ch.unige.pinfo.search.dto.OrganizerDto;
import io.quarkus.kafka.client.serialization.ObjectMapperDeserializer;

public class OrganizerDtoDeserializer extends ObjectMapperDeserializer<OrganizerDto> {
    public OrganizerDtoDeserializer() {
        super(OrganizerDto.class);
    }
}