package ch.unige.pinfo.event;

import ch.unige.pinfo.event.openapi.api.AnnouncementsApi;
import ch.unige.pinfo.event.openapi.model.AnnouncementPage;
import ch.unige.pinfo.event.openapi.model.AnnouncementResponse;
import ch.unige.pinfo.event.openapi.model.CreateAnnouncementRequest;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/events/{eventId}/announcements")
public class EventAnnouncementResource implements AnnouncementsApi {

    private static final Map<UUID, List<AnnouncementResponse>> ANNOUNCEMENTS = new HashMap<>();

    @Override
    public void apiEventsEventIdAnnouncementsAnnouncementIdDelete(UUID eventId, UUID announcementId) {
        List<AnnouncementResponse> entries = ANNOUNCEMENTS.getOrDefault(eventId, new ArrayList<>());
        entries.removeIf(a -> announcementId.equals(a.getAnnouncementId()));
    }

    @Override
    public AnnouncementResponse apiEventsEventIdAnnouncementsAnnouncementIdGet(UUID eventId, UUID announcementId) {
        List<AnnouncementResponse> entries = ANNOUNCEMENTS.getOrDefault(eventId, new ArrayList<>());
        return entries.stream()
                .filter(a -> announcementId.equals(a.getAnnouncementId()))
                .findFirst()
                .orElseThrow(NotFoundException::new);
    }

    @Override
    public AnnouncementPage apiEventsEventIdAnnouncementsGet(UUID eventId, Integer page, Integer size) {
        List<AnnouncementResponse> entries = ANNOUNCEMENTS.getOrDefault(eventId, new ArrayList<>());
        return new AnnouncementPage()
                .content(entries)
                .page(page == null ? 0 : page)
                .size(size == null ? entries.size() : size)
                .totalElements(entries.size())
                .totalPages(1);
    }

    @Override
    public AnnouncementResponse apiEventsEventIdAnnouncementsPost(UUID eventId,
            CreateAnnouncementRequest createAnnouncementRequest) {
        AnnouncementResponse created = new AnnouncementResponse()
                .announcementId(UUID.randomUUID())
                .eventId(eventId)
                .organizerId(new UUID(0L, 1L))
                .body(createAnnouncementRequest.getBody())
                .postedAt(OffsetDateTime.now());

        ANNOUNCEMENTS.computeIfAbsent(eventId, k -> new ArrayList<>()).add(created);
        return created;
    }
}
