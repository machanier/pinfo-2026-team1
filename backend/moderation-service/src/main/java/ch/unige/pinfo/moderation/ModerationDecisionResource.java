package ch.unige.pinfo.moderation;

import ch.unige.pinfo.moderation.openapi.api.DecisionsApi;
import ch.unige.pinfo.moderation.openapi.model.ApiModerationQueueCaseIdApprovePatchRequest;
import ch.unige.pinfo.moderation.openapi.model.ApiModerationQueueCaseIdRejectPatchRequest;
import ch.unige.pinfo.moderation.openapi.model.ModerationCase;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Path("/api/moderation/queue/{caseId}")
public class ModerationDecisionResource implements DecisionsApi {

    private static final Map<Long, String> ADMIN_NOTES = new HashMap<>();
    private static final Map<Long, String> REJECTION_REASONS = new HashMap<>();

    @Override
    @Transactional
    public ModerationCase apiModerationQueueCaseIdApprovePatch(UUID caseId,
            ApiModerationQueueCaseIdApprovePatchRequest request) {
        ModerationFlag row = ModerationFlag.findById(ModerationResource.toLongId(caseId));
        if (row == null) {
            throw new NotFoundException();
        }
        row.status = ModerationStatus.APPROVED.toString();
        ADMIN_NOTES.put(row.id, request == null ? null : request.getAdminNote());

        ModerationCase result = ModerationResource.toModerationCase(row);
        result.setAdminNote(ADMIN_NOTES.get(row.id));
        result.setDecidedAt(OffsetDateTime.now());
        return result;
    }

    @Override
    @Transactional
    public ModerationCase apiModerationQueueCaseIdRejectPatch(UUID caseId,
            ApiModerationQueueCaseIdRejectPatchRequest request) {
        ModerationFlag row = ModerationFlag.findById(ModerationResource.toLongId(caseId));
        if (row == null) {
            throw new NotFoundException();
        }
        row.status = ModerationStatus.REJECTED.toString();
        REJECTION_REASONS.put(row.id, request.getReason());

        ModerationCase result = ModerationResource.toModerationCase(row);
        result.setRejectionReason(REJECTION_REASONS.get(row.id));
        result.setDecidedAt(OffsetDateTime.now());
        return result;
    }
}
