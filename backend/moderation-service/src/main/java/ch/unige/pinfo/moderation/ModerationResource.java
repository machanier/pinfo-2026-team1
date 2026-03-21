package ch.unige.pinfo.moderation;

import ch.unige.pinfo.moderation.openapi.api.QueueApi;
import ch.unige.pinfo.moderation.openapi.model.ModerationCase;
import ch.unige.pinfo.moderation.openapi.model.ModerationCasePage;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/api/moderation/queue")
public class ModerationResource implements QueueApi {

    @Override
    public ModerationCase apiModerationQueueCaseIdGet(UUID caseId) {
        ModerationFlag flag = ModerationFlag.findById(toLongId(caseId));
        if (flag == null) {
            throw new NotFoundException();
        }
        return toModerationCase(flag);
    }

    @Override
    public ModerationCasePage apiModerationQueueGet(ModerationStatus status, Integer page, Integer size) {
        @SuppressWarnings("unchecked")
        List<ModerationFlag> rows = (List<ModerationFlag>) (List<?>) ModerationFlag.listAll();
        var content = new ArrayList<ModerationCase>();
        for (ModerationFlag row : rows) {
            ModerationStatus currentStatus = toStatus(row.status);
            if (status == null || currentStatus == status) {
                content.add(toModerationCase(row));
            }
        }

        return new ModerationCasePage()
                .content(content)
                .page(page == null ? 0 : page)
                .size(size == null ? content.size() : size)
                .totalElements(content.size())
                .totalPages(1);
    }

    static ModerationCase toModerationCase(ModerationFlag row) {
        ch.unige.pinfo.moderation.openapi.model.ModerationFlag modelFlag = new ch.unige.pinfo.moderation.openapi.model.ModerationFlag()
                .field(row.targetType)
                .reason(row.reason)
                .confidence(1.0f);

        return new ModerationCase()
                .caseId(toUuid(row.id))
                .eventId(toUuid(row.targetId == null ? 0L : row.targetId))
                .eventTitle("event")
                .organizerId(new UUID(0L, 1L))
                .status(toStatus(row.status))
                .addFlagsItem(modelFlag)
                .createdAt(OffsetDateTime.now());
    }

    static ModerationStatus toStatus(String status) {
        if (status == null) {
            return ModerationStatus.PENDING;
        }
        try {
            return ModerationStatus.fromValue(status);
        } catch (IllegalArgumentException ex) {
            return ModerationStatus.PENDING;
        }
    }

    static long toLongId(UUID id) {
        return id.getLeastSignificantBits() & Long.MAX_VALUE;
    }

    static UUID toUuid(long id) {
        return new UUID(0L, id);
    }
}
