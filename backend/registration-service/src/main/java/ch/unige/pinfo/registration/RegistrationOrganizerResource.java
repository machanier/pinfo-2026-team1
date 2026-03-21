package ch.unige.pinfo.registration;

import ch.unige.pinfo.registration.openapi.api.OrganizerApi;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStats;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import jakarta.ws.rs.Path;
import java.util.ArrayList;
import java.util.UUID;

@Path("/api/events/{eventId}/registrations")
public class RegistrationOrganizerResource implements OrganizerApi {

    @Override
    public RegistrationPage apiEventsEventIdRegistrationsGet(UUID eventId, RegistrationStatus status, Integer page,
            Integer size) {
        var rows = Registration.<Registration>find("eventId", RegistrationResource.toLongId(eventId)).list();
        var content = new ArrayList<RegistrationResponse>();
        for (Registration row : rows) {
            RegistrationStatus currentStatus = RegistrationResource.toStatus(row.status);
            if (status == null || currentStatus == status) {
                content.add(RegistrationResource.toResponse(row));
            }
        }

        return new RegistrationPage()
                .content(content)
                .page(page == null ? 0 : page)
                .size(size == null ? content.size() : size)
                .totalElements(content.size())
                .totalPages(1);
    }

    @Override
    public RegistrationResponse apiEventsEventIdRegistrationsRegistrationIdConfirmPatch(UUID eventId,
            UUID registrationId) {
        Registration registration = Registration.findById(RegistrationResource.toLongId(registrationId));
        if (registration == null) {
            throw new jakarta.ws.rs.NotFoundException();
        }
        registration.status = RegistrationStatus.CONFIRMED.toString();
        return RegistrationResource.toResponse(registration);
    }

    @Override
    public RegistrationStats apiEventsEventIdRegistrationsStatsGet(UUID eventId) {
        var rows = Registration.<Registration>find("eventId", RegistrationResource.toLongId(eventId)).list();
        int confirmed = 0;
        int pending = 0;
        int waitlisted = 0;
        int cancelled = 0;

        for (Registration row : rows) {
            RegistrationStatus status = RegistrationResource.toStatus(row.status);
            switch (status) {
                case CONFIRMED -> confirmed++;
                case WAITLISTED -> waitlisted++;
                case CANCELLED -> cancelled++;
                default -> pending++;
            }
        }

        return new RegistrationStats()
                .eventId(eventId)
                .confirmed(confirmed)
                .pending(pending)
                .waitlisted(waitlisted)
                .cancelled(cancelled)
                .capacity(null)
                .availableSlots(null);
    }
}
