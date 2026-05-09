package ch.unige.pinfo.moderation.resource;

import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.openapi.api.QueueApi;
import ch.unige.pinfo.moderation.openapi.model.ModerationCase;
import ch.unige.pinfo.moderation.openapi.model.ModerationCasePage;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;

import java.util.List;
import java.util.UUID;

@Path("/api/moderation/queue")
public class QueueResource implements QueueApi {

    @Inject
    ModerationCaseRepository caseRepository;

    @Override
    @Transactional
    @RolesAllowed("Admin")
    public ModerationCase apiModerationQueueCaseIdGet(UUID caseId) {
        ch.unige.pinfo.moderation.model.ModerationCase moderationCase = caseRepository.findById(caseId);
        if (moderationCase == null) {
            throw new NotFoundException("Moderation case not found: " + caseId);
        }

        return toApiModel(moderationCase);
    }

    @Override
    @Transactional
    @RolesAllowed("Admin")
    public ModerationCasePage apiModerationQueueGet(ModerationStatus status, Integer page, Integer size) {
        ModerationStatus effectiveStatus = status != null ? status : ModerationStatus.PENDING;
        int resolvedPage = page != null ? page : 0;
        int resolvedSize = size != null ? size : 30;

        PanacheQuery<ch.unige.pinfo.moderation.model.ModerationCase> query = caseRepository.find("status",
                effectiveStatus);
        long totalElements = query.count();

        if (resolvedSize > 0) {
            query.page(Page.of(resolvedPage, resolvedSize));
        }

        List<ModerationCase> content = query.list().stream()
                .map(this::toApiModel)
                .toList();

        ModerationCasePage response = new ModerationCasePage();
        response.setContent(content);
        response.setPage(resolvedPage);
        response.setSize(resolvedSize);
        response.setTotalElements((int) totalElements);
        response.setTotalPages(calculateTotalPages(totalElements, resolvedSize));
        return response;
    }

    private int calculateTotalPages(long totalElements, int size) {
        if (size <= 0) {
            return 1;
        }

        return (int) Math.ceil((double) totalElements / (double) size);
    }

    // Convert persistence model instance to API model instance for moderation case
    private ModerationCase toApiModel(ch.unige.pinfo.moderation.model.ModerationCase entity) {
        ModerationCase apiCase = new ModerationCase();
        apiCase.setCaseId(entity.caseId);
        apiCase.setEventId(entity.eventId);
        apiCase.setTitle(entity.title);
        apiCase.setOrganizerId(entity.organizerId);
        apiCase.setStatus(entity.status);
        apiCase.setFlags(mapFlags(entity.flags));
        apiCase.setAdminNote(entity.adminNote);
        apiCase.setRejectionReason(entity.rejectionReason);
        apiCase.setCreatedAt(entity.createdAt);
        apiCase.setDecidedAt(entity.decidedAt);
        return apiCase;
    }

    // Convert persistence model instance to API model instance for moderation flag
    private List<ch.unige.pinfo.moderation.openapi.model.ModerationFlag> mapFlags(
            List<ModerationFlag> flags) {
        if (flags == null) {
            return List.of();
        }

        return flags.stream()
                .map(this::toApiFlag)
                .toList();
    }

    private ch.unige.pinfo.moderation.openapi.model.ModerationFlag toApiFlag(ModerationFlag flag) {
        ch.unige.pinfo.moderation.openapi.model.ModerationFlag apiFlag = new ch.unige.pinfo.moderation.openapi.model.ModerationFlag();
        apiFlag.setField(flag.field);
        apiFlag.setReason(flag.reason);
        apiFlag.setConfidence(flag.confidence);
        return apiFlag;
    }
}
