package ch.unige.pinfo.moderation.repository;

import ch.unige.pinfo.moderation.model.ModerationCase;
import java.util.UUID;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ModerationCaseRepository implements PanacheRepositoryBase<ModerationCase, UUID> {

    /**
     * Most recent event-level moderation case for an event (announcement cases excluded),
     * or {@code null} if the event was never screened. Used to tell whether an incoming
     * event.updated carries new content or is just a status-only echo.
     */
    public ModerationCase findLatestByEventId(UUID eventId) {
        return find("eventId = ?1 and announcementId is null order by createdAt desc", eventId)
                .firstResult();
    }
}