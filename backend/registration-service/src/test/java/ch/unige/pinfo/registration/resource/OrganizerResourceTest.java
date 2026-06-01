package ch.unige.pinfo.registration.resource;

import ch.unige.pinfo.registration.client.EventServiceClient;
import ch.unige.pinfo.registration.dto.EventDto;
import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.model.RegistrationPage;
import ch.unige.pinfo.registration.openapi.model.RegistrationStats;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@QuarkusTest
class OrganizerResourceTest {

    @InjectMock
    @RestClient
    EventServiceClient eventServiceClient;

    @InjectMock
    JsonWebToken jwt;

    @jakarta.inject.Inject
    OrganizerResource organizerResource;

    private final UUID eventId = UUID.randomUUID();
    // PINFO-218: the JWT subject is the raw Auth0 ID, but event-service
    // stores organizers as UUIDs derived from that subject via
    // UUID.nameUUIDFromBytes(subject.getBytes(UTF_8)). The test fixtures
    // mirror that pipeline so the ownership check works end-to-end.
    private static final String TEST_ORGANIZER_SUB = "auth0|test-student-id";
    private static final UUID userId = UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2");
    private static final UUID userOrganizerUuid = UUID.nameUUIDFromBytes(
            TEST_ORGANIZER_SUB.getBytes(java.nio.charset.StandardCharsets.UTF_8));

    @BeforeEach
    void stubJwtSubject() {
        // @TestSecurity règle la SecurityIdentity (le user/roles) mais ne propage
        // pas le claim "sub" vers le @InjectMock JsonWebToken. Sans ce stub,
        // jwt.getSubject() renvoie null → la vérification d'ownership de
        // OrganizerResource jette ForbiddenException et les tests "Success" sont
        // en erreur. Les tests qui veulent un sub null le surchargent localement.
        when(jwt.getSubject()).thenReturn(TEST_ORGANIZER_SUB);
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER_SUB, roles = "ORGANIZER")
    @DisplayName("Get Registrations: Should return paginated list when owner")
    void testGetRegistrationsSuccess() {
        // GIVEN
        mockOwnership(true);
        PanacheMock.mock(Registration.class);

        Registration reg = new Registration();
        reg.setRegistrationId(UUID.randomUUID());
        reg.setStatus(RegistrationStatus.CONFIRMED);

        PanacheQuery<Registration> query = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) query);
        when(query.page(any())).thenReturn(query);
        when(query.list()).thenReturn(List.of(reg));
        when(query.count()).thenReturn(1L);

        // WHEN
        RegistrationPage result = organizerResource.apiEventsEventIdRegistrationsGet(eventId,
                RegistrationStatus.CONFIRMED, 0, 10);

        // THEN
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(1, result.getTotalPages());
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER_SUB, roles = "ORGANIZER")
    @DisplayName("Get Stats: Should calculate slots correctly")
    void testGetStatsSuccess() {
        // GIVEN
        mockOwnership(true);
        PanacheMock.mock(Registration.class);

        EventDto event = new EventDto();
        // Utilisation de setters ou réflexion selon ton DTO
        event.setStatus("OPEN");
        // Note: Si EventDto n'a pas de setter pour capacity, on mock l'objet ou on
        // passe par JSON
        EventDto eventSpy = spy(new EventDto());
        when(eventSpy.getCapacity()).thenReturn(100);
        when(eventSpy.getOrganizerId()).thenReturn(userOrganizerUuid);
        when(eventServiceClient.getEvent(eventId)).thenReturn(eventSpy);

        when(Registration.count(anyString(), any(Object[].class))).thenReturn(10L);

        // WHEN
        RegistrationStats stats = organizerResource.apiEventsEventIdRegistrationsStatsGet(eventId);

        // THEN
        assertNotNull(stats);
        assertEquals(100, stats.getCapacity());
        assertEquals(80, stats.getAvailableSlots()); // 100 - 10 (conf) - 10 (pend)
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER_SUB, roles = "ORGANIZER")
    @DisplayName("Ownership: Should throw NotFound when event does not exist")
    void testOwnershipNotFound() {
        when(eventServiceClient.getEvent(eventId)).thenReturn(null);
        assertThrows(NotFoundException.class, () -> organizerResource.apiEventsEventIdRegistrationsStatsGet(eventId));
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER_SUB, roles = "ORGANIZER")
    @DisplayName("Ownership: Should throw Forbidden when user is not organizer")
    void testOwnershipForbidden() {
        EventDto event = mock(EventDto.class);
        // A different organizer's UUID — same shape as production data.
        when(event.getOrganizerId()).thenReturn(UUID.randomUUID());
        when(eventServiceClient.getEvent(eventId)).thenReturn(event);

        assertThrows(ForbiddenException.class, () -> organizerResource.apiEventsEventIdRegistrationsStatsGet(eventId));
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER_SUB, roles = "ORGANIZER")
    @DisplayName("Ownership: Should throw Forbidden when event has a non-UUID organizerId")
    void testOwnershipForbiddenWhenOrganizerIdNotUuid() {
        // PINFO-218 regression guard: legacy/malformed event docs that ship a
        // non-UUID organizerId must not silently pass — must produce 403,
        // never 200/500.
        EventDto event = mock(EventDto.class);
        when(event.getOrganizerId()).thenReturn(UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59d4"));
        when(eventServiceClient.getEvent(eventId)).thenReturn(event);

        assertThrows(ForbiddenException.class, () -> organizerResource.apiEventsEventIdRegistrationsStatsGet(eventId));
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER_SUB, roles = "ORGANIZER")
    @DisplayName("Ownership: Should throw Forbidden when JWT subject is null")
    void testOwnershipForbiddenWhenSubjectNull() {
        when(jwt.getSubject()).thenReturn(null);
        EventDto event = mock(EventDto.class);
        when(event.getOrganizerId()).thenReturn(userOrganizerUuid);
        when(eventServiceClient.getEvent(eventId)).thenReturn(event);

        assertThrows(ForbiddenException.class, () -> organizerResource.apiEventsEventIdRegistrationsStatsGet(eventId));
    }

    @Test
    @TestSecurity(user = TEST_ORGANIZER_SUB, roles = "ORGANIZER")
    @DisplayName("Confirm: Should throw UnsupportedOperationException")
    void testConfirmNotImplemented() {
        mockOwnership(true);
        assertThrows(UnsupportedOperationException.class, () -> organizerResource
                .apiEventsEventIdRegistrationsRegistrationIdConfirmPatch(eventId, UUID.randomUUID()));
    }

    // Helper pour simuler l'ownership
    private void mockOwnership(boolean isOwner) {
        EventDto event = mock(EventDto.class);
        // PINFO-218: organizerId is a UUID string (the same UUID we'd derive
        // from the JWT subject). Owner case ⇒ derived UUID; non-owner ⇒
        // a fresh random UUID.
        when(event.getOrganizerId()).thenReturn(
                (isOwner ? userOrganizerUuid : UUID.randomUUID()));
        when(eventServiceClient.getEvent(eventId)).thenReturn(event);
    }
}