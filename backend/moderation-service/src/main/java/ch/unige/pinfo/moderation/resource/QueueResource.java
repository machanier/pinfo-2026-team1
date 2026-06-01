package ch.unige.pinfo.moderation.resource;

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
    @RolesAllowed("ADMIN")
    public ModerationCase apiModerationQueueCaseIdGet(UUID caseId) {
        ch.unige.pinfo.moderation.model.ModerationCase moderationCase = caseRepository.findById(caseId);
        if (moderationCase == null) {
            throw new NotFoundException("Moderation case not found: " + caseId);
        }

        return ModerationCaseMapper.toApiModel(moderationCase);
    }

    @Override
    @Transactional
    @RolesAllowed("ADMIN")
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
            .map(ModerationCaseMapper::toApiModel)
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

}
