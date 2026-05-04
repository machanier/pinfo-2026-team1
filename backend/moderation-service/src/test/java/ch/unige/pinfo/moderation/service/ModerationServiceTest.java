package ch.unige.pinfo.moderation.service;

import ch.unige.pinfo.moderation.messaging.EventCreatedMessage;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;
import jakarta.inject.Inject;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.argThat;

@QuarkusTest
class ModerationServiceTest {

        @Inject
        ModerationService moderationService;

        @InjectMock
        ModerationCaseRepository caseRepository;

        private EventCreatedMessage makeEvent(String title, String description) {
                EventCreatedMessage msg = new EventCreatedMessage();
                msg.eventId = UUID.randomUUID();
                msg.organizerId = UUID.randomUUID();
                msg.title = title;
                msg.description = description;
                return msg;
        }

        @Test
        void screenEvent_cleanContent_createsAutoApprovedCase() {
                EventCreatedMessage event = makeEvent(
                                "Chess Tournament",
                                "Join us for a friendly chess tournament open to all students.");

                moderationService.screenEvent(event);

                verify(caseRepository)
                                .persist(argThat((ModerationCase c) -> c.status == ModerationStatus.AUTO_APPROVED &&
                                                c.eventId.equals(event.eventId)));
        }

        @Test
        void screenEvent_suspiciousContent_createsPendingCase() {
                EventCreatedMessage event = makeEvent(
                                "FREE MONEY CLICK HERE",
                                "Send us your bank details to claim your prize!!!");

                moderationService.screenEvent(event);

                verify(caseRepository).persist(argThat((ModerationCase c) -> c.status == ModerationStatus.PENDING &&
                                !c.flags.isEmpty()));
        }

        @Test
        void screenEvent_suspiciousContent_2b_createsPendingCase() {
                EventCreatedMessage event = makeEvent(
                                "FREE MONEY CLICK HERE",
                                "Kill yourself now!");

                moderationService.screenEvent(event);

                verify(caseRepository).persist(argThat((ModerationCase c) -> c.status == ModerationStatus.PENDING &&
                                !c.flags.isEmpty()));
        }

        @Test
        void screenEvent_ollamaUnavailable_createsFallbackPendingCase() {
                // simulate OpenAI being down by using a bad URL in test properties
                EventCreatedMessage event = makeEvent("Normal Event", "Normal description");

                // force the fallback path
                moderationService.createFallbackCase(event);

                verify(caseRepository).persist(argThat((ModerationCase c) -> c.status == ModerationStatus.PENDING &&
                                c.flags.stream().anyMatch(f -> f.reason.contains("unavailable"))));
        }
}