package ch.model;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import ch.unige.pinfo.event.model.Announcement;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class AnnouncementTest {

    @Test
    void savePostingTime_setsCurrentTimeOnPersist() {
        Announcement announcement = new Announcement();
        announcement.announcementId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        announcement.eventId = UUID.fromString("00000000-0000-0000-0000-000000000000");
        announcement.organizerId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        announcement.body = "Test";

        OffsetDateTime beforeCall = OffsetDateTime.now();
        announcement.savePostingTime();
        OffsetDateTime afterCall = OffsetDateTime.now();

        assertNotNull(announcement.postedAt);
        assertNotNull(announcement.postedAt.getOffset()); // Has timezone info

        assertTrue(announcement.postedAt.isAfter(beforeCall),
                "Posted time should be after method call");
        assertTrue(announcement.postedAt.isBefore(afterCall.plusSeconds(1)),
                "Posted time should be within 1 second of method call");
    }
}