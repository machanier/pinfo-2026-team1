package ch.unige.pinfo.event.messaging;

import ch.unige.pinfo.event.model.Announcement;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class AnnouncementChangePublisherUnitTest {

    @Test
    void testAnnouncementPostedHandlesExceptionGracefully() throws Exception {
        AnnouncementChangePublisher publisher = new AnnouncementChangePublisher();

        ObjectMapper mockMapper = Mockito.mock(ObjectMapper.class);
        Mockito.when(mockMapper.writeValueAsString(Mockito.any()))
                .thenThrow(new RuntimeException("Simulated Jackson exception"));

        publisher.objectMapper = mockMapper;
        publisher.announcementEmitter = Mockito.mock(Emitter.class);

        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.randomUUID();

        assertDoesNotThrow(() -> publisher.announcementPosted(announcement));
    }

    @Test
    void testAnnouncementSubmittedHandlesExceptionGracefully() throws Exception {
        AnnouncementChangePublisher publisher = new AnnouncementChangePublisher();

        ObjectMapper mockMapper = Mockito.mock(ObjectMapper.class);
        Mockito.when(mockMapper.writeValueAsString(Mockito.any()))
                .thenThrow(new RuntimeException("Simulated Jackson exception"));

        publisher.objectMapper = mockMapper;
        publisher.announcementSubmittedEmitter = Mockito.mock(Emitter.class);

        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.randomUUID();

        assertDoesNotThrow(() -> publisher.announcementSubmitted(announcement));
    }
}
