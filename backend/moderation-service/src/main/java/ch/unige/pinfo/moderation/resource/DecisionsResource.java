package ch.unige.pinfo.moderation.resource;

import ch.unige.pinfo.moderation.event.EventServiceClient;
import ch.unige.pinfo.moderation.messaging.EventModeratedPublisher;
import ch.unige.pinfo.moderation.openapi.api.DecisionsApi;
import ch.unige.pinfo.moderation.openapi.model.ApiModerationQueueCaseIdApprovePatchRequest;
import ch.unige.pinfo.moderation.openapi.model.ApiModerationQueueCaseIdRejectPatchRequest;
import ch.unige.pinfo.moderation.openapi.model.ErrorResponse;
import ch.unige.pinfo.moderation.openapi.model.ModerationCase;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.time.OffsetDateTime;
import java.util.UUID;

@Path("/api/moderation/queue/{caseId}")
public class DecisionsResource implements DecisionsApi {

    @Inject
    ModerationCaseRepository caseRepository;

    @Inject
    @RestClient
    EventServiceClient eventServiceClient;

    @Inject
    EventModeratedPublisher eventModeratedPublisher;

    @ConfigProperty(name = "internal.service.key", defaultValue = "")
    String internalServiceKey;

    @Override
    @Transactional
    @RolesAllowed("ADMIN")
    public ModerationCase apiModerationQueueCaseIdApprovePatch(
            UUID caseId,
            ApiModerationQueueCaseIdApprovePatchRequest request) {

        ch.unige.pinfo.moderation.model.ModerationCase moderationCase = getCaseOrThrow(caseId);
        assertPending(moderationCase);

        if (moderationCase.announcementId != null && !publishAnnouncement(moderationCase.announcementId)) {
            throw new WebApplicationException(Response.status(Response.Status.BAD_GATEWAY)
                    .entity(buildError(Response.Status.BAD_GATEWAY, "Failed to publish announcement"))
                    .build());
        }

        if (moderationCase.announcementId == null && !emitEventDecision(moderationCase.eventId, "APPROVED")) {
            throw new WebApplicationException(Response.status(Response.Status.BAD_GATEWAY)
                    .entity(buildError(Response.Status.BAD_GATEWAY, "Failed to publish moderation decision"))
                    .build());
        }

        moderationCase.status = ModerationStatus.APPROVED;
        moderationCase.adminNote = request != null ? request.getAdminNote() : null;
        moderationCase.decidedAt = OffsetDateTime.now();

        return ModerationCaseMapper.toApiModel(moderationCase);
    }

    @Override
    @Transactional
    @RolesAllowed("ADMIN")
    public ModerationCase apiModerationQueueCaseIdRejectPatch(
            UUID caseId,
            ApiModerationQueueCaseIdRejectPatchRequest request) {

        if (request == null || request.getReason() == null) {
            throw new BadRequestException("Rejection reason is required");
        }

        ch.unige.pinfo.moderation.model.ModerationCase moderationCase = getCaseOrThrow(caseId);
        assertPending(moderationCase);

        moderationCase.status = ModerationStatus.REJECTED;
        moderationCase.rejectionReason = request.getReason();
        moderationCase.decidedAt = OffsetDateTime.now();

        if (moderationCase.announcementId == null && !emitEventDecision(moderationCase.eventId, "REJECTED")) {
            throw new WebApplicationException(Response.status(Response.Status.BAD_GATEWAY)
                    .entity(buildError(Response.Status.BAD_GATEWAY, "Failed to publish moderation decision"))
                    .build());
        }

        return ModerationCaseMapper.toApiModel(moderationCase);
    }

    private ch.unige.pinfo.moderation.model.ModerationCase getCaseOrThrow(UUID caseId) {
        ch.unige.pinfo.moderation.model.ModerationCase moderationCase = caseRepository.findById(caseId);
        if (moderationCase == null) {
            throw new NotFoundException("Moderation case not found: " + caseId);
        }

        return moderationCase;
    }

    private void assertPending(ch.unige.pinfo.moderation.model.ModerationCase moderationCase) {
        if (moderationCase.status != ModerationStatus.PENDING) {
            throw new WebApplicationException(Response.status(Response.Status.CONFLICT)
                    .entity(buildError(Response.Status.CONFLICT, "Case is not in PENDING status"))
                    .build());
        }
    }

    private boolean publishAnnouncement(UUID announcementId) {
        try (Response response = eventServiceClient.publishAnnouncement(announcementId, internalServiceKey)) {
            return response != null
                    && response.getStatusInfo().getFamily() == Response.Status.Family.SUCCESSFUL;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean emitEventDecision(UUID eventId, String status) {
        try {
            eventModeratedPublisher.sendDecision(eventId, status);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private ErrorResponse buildError(Response.Status status, String message) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setStatus(status.getStatusCode());
        errorResponse.setError(status.getReasonPhrase());
        errorResponse.setMessage(message);
        errorResponse.setTimestamp(OffsetDateTime.now());
        return errorResponse;
    }
}