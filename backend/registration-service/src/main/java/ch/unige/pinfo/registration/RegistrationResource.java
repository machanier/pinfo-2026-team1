package ch.unige.pinfo.registration;

import ch.unige.pinfo.registration.openapi.api.RegistrationsApi;
import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.UUID;

@Path("/api/registrations")
public class RegistrationResource implements RegistrationsApi {

    @Override
    public RegistrationPage apiRegistrationsMeGet(RegistrationStatus status, Integer page, Integer size) {
        long currentUserId = 1L;
        var records = Registration.<Registration>find("userId", currentUserId).list();
        var content = new ArrayList<RegistrationResponse>();
        for (Registration record : records) {
            RegistrationStatus currentStatus = toStatus(record.status);
            if (status == null || status == currentStatus) {
                content.add(toResponse(record));
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
    @Transactional
    public RegistrationResponse apiRegistrationsPost(CreateRegistrationRequest createRegistrationRequest) {
        Registration created = new Registration();
        created.userId = 1L;
        created.eventId = toLongId(createRegistrationRequest.getEventId());
        created.status = RegistrationStatus.CONFIRMED.toString();
        created.persist();
        return toResponse(created);
    }

    @Override
    @Transactional
    public void apiRegistrationsRegistrationIdDelete(UUID registrationId) {
        Registration registration = Registration.findById(toLongId(registrationId));
        if (registration == null) {
            throw new NotFoundException();
        }
        registration.status = RegistrationStatus.CANCELLED.toString();
    }

    @Override
    public RegistrationResponse apiRegistrationsRegistrationIdGet(UUID registrationId) {
        Registration registration = Registration.findById(toLongId(registrationId));
        if (registration == null) {
            throw new NotFoundException();
        }
        return toResponse(registration);
    }

    static RegistrationResponse toResponse(Registration registration) {
        return new RegistrationResponse()
                .registrationId(toUuid(registration.id))
                .eventId(toUuid(registration.eventId == null ? 0L : registration.eventId))
                .studentId(toUuid(registration.userId == null ? 0L : registration.userId))
                .status(toStatus(registration.status))
                .registeredAt(OffsetDateTime.now());
    }

    static RegistrationStatus toStatus(String value) {
        if (value == null) {
            return RegistrationStatus.PENDING;
        }
        try {
            return RegistrationStatus.fromValue(value);
        } catch (IllegalArgumentException ex) {
            return RegistrationStatus.PENDING;
        }
    }

    static long toLongId(UUID id) {
        return id.getLeastSignificantBits() & Long.MAX_VALUE;
    }

    static UUID toUuid(long id) {
        return new UUID(0L, id);
    }
}
