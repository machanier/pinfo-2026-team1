package ch.unige.pinfo.moderation.resource;

import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.openapi.model.ModerationCase;

import java.util.List;

final class ModerationCaseMapper {

    private ModerationCaseMapper() {
    }

    static ModerationCase toApiModel(ch.unige.pinfo.moderation.model.ModerationCase entity) {
        ModerationCase apiCase = new ModerationCase();
        apiCase.setCaseId(entity.caseId);
        apiCase.setEventId(entity.eventId);
        apiCase.setAnnouncementId(entity.announcementId);
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

    private static List<ch.unige.pinfo.moderation.openapi.model.ModerationFlag> mapFlags(
            List<ModerationFlag> flags) {
        if (flags == null) {
            return List.of();
        }

        return flags.stream()
                .map(ModerationCaseMapper::toApiFlag)
                .toList();
    }

    private static ch.unige.pinfo.moderation.openapi.model.ModerationFlag toApiFlag(ModerationFlag flag) {
        ch.unige.pinfo.moderation.openapi.model.ModerationFlag apiFlag =
                new ch.unige.pinfo.moderation.openapi.model.ModerationFlag();
        apiFlag.setField(flag.field);
        apiFlag.setReason(flag.reason);
        apiFlag.setConfidence(flag.confidence);
        return apiFlag;
    }
}
