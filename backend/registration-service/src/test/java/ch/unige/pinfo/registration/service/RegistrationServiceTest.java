package ch.unige.pinfo.registration.service;

import ch.unige.pinfo.registration.client.EventServiceClient;
import ch.unige.pinfo.registration.client.UserServiceClient;
import ch.unige.pinfo.registration.dto.*;
import ch.unige.pinfo.registration.messaging.RegistrationEventPublisher;
import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.model.CreateRegistrationRequest;
import ch.unige.pinfo.registration.openapi.model.RegistrationResponse;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@QuarkusTest
class RegistrationServiceTest {

    @Inject
    RegistrationService service;

    @InjectMock
    @RestClient
    EventServiceClient eventClient;

    @InjectMock
    @RestClient
    UserServiceClient userClient;

    @InjectMock
    RegistrationEventPublisher eventPublisher;

    private final String STUDENT_ID = "student-42";
    private final UUID EVENT_ID = UUID.randomUUID();

    @Test
    @DisplayName("Register: Should succeed (Confirmed) when eligible and slots available")
    void testRegisterSuccess() {
        PanacheMock.mock(Registration.class);
        CreateRegistrationRequest req = new CreateRegistrationRequest();
        req.setEventId(EVENT_ID);

        // 1. Not registered yet
        PanacheQuery queryMock = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) queryMock);
        when(queryMock.firstResultOptional()).thenReturn(Optional.empty());

        // 2. Event published
        EventDto event = new EventDto();
        event.setStatus("PUBLISHED");
        when(eventClient.getEvent(EVENT_ID)).thenReturn(event);

        // 3. Capacity OK
        CapacityDto capacity = mock(CapacityDto.class);
        when(capacity.getIsFull()).thenReturn(false);
        when(eventClient.getCapacity(EVENT_ID)).thenReturn(capacity);

        // WHEN
        RegistrationResponse res = service.register(STUDENT_ID, req);

        // THEN
        assertNotNull(res);
        assertEquals(RegistrationStatus.CONFIRMED, res.getStatus());
        verify(eventPublisher).publishConfirmed(any(), any(), eq(STUDENT_ID));
    }

    @Test
    @DisplayName("Register: Should go to Waitlist when event is full")
    void testRegisterWaitlist() {
        PanacheMock.mock(Registration.class);
        CreateRegistrationRequest req = new CreateRegistrationRequest();
        req.setEventId(EVENT_ID);

        PanacheQuery queryMock = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) queryMock);
        when(Registration.count(anyString(), any(Object[].class))).thenReturn(5L);

        EventDto event = new EventDto();
        event.setStatus("PUBLISHED");
        when(eventClient.getEvent(EVENT_ID)).thenReturn(event);

        CapacityDto capacity = mock(CapacityDto.class);
        when(capacity.getIsFull()).thenReturn(true);
        when(eventClient.getCapacity(EVENT_ID)).thenReturn(capacity);

        // WHEN
        RegistrationResponse res = service.register(STUDENT_ID, req);

        // THEN
        assertEquals(RegistrationStatus.WAITLISTED, res.getStatus());
        assertEquals(6, res.getWaitlistPosition());
        verify(eventPublisher).publishWaitlisted(any(), any(), eq(STUDENT_ID), eq(6));
    }

    @Test
    @DisplayName("Register: Should throw Forbidden when eligibility fails")
    void testRegisterEligibilityFail() {
        PanacheMock.mock(Registration.class);

        PanacheQuery<Registration> queryMock = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) queryMock);
        when(queryMock.firstResultOptional()).thenReturn(Optional.empty());

        CreateRegistrationRequest req = new CreateRegistrationRequest();
        req.setEventId(EVENT_ID);

        // Configurer des règles (ex: Faculté de Droit seulement)
        EventDto event = new EventDto();
        event.setStatus("PUBLISHED");
        EligibilityRuleDto rule = new EligibilityRuleDto();
        rule.getFaculties().add("DROIT");
        event.setRestrictedTo(rule);
        when(eventClient.getEvent(EVENT_ID)).thenReturn(event);

        // L'étudiant est en SCIENCES
        EligibilityAttributesDTO attrs = new EligibilityAttributesDTO(UUID.randomUUID(), "SCIENCES", "CS", "PHD");
        when(userClient.checkEligibility(STUDENT_ID)).thenReturn(attrs);

        // WHEN & THEN
        WebApplicationException ex = assertThrows(WebApplicationException.class,
                () -> service.register(STUDENT_ID, req));
        assertEquals(403, ex.getResponse().getStatus());
    }

    @Test
    @DisplayName("Cancel: Should succeed and notify waitlist")
    void testCancelSuccess() {
        PanacheMock.mock(Registration.class);
        UUID regId = UUID.randomUUID();

        Registration reg = spy(new Registration());
        reg.setStudentId(STUDENT_ID);
        reg.setEventId(EVENT_ID);
        reg.setStatus(RegistrationStatus.CONFIRMED);

        when(Registration.findById(regId)).thenReturn(reg);

        EventDto event = new EventDto();
        event.setTime(OffsetDateTime.now().plusDays(1)); // Event dans le futur
        when(eventClient.getEvent(EVENT_ID)).thenReturn(event);

        CapacityDto capacity = mock(CapacityDto.class);
        when(capacity.getCapacity()).thenReturn(10);
        when(capacity.getRegisteredCount()).thenReturn(5);
        when(eventClient.getCapacity(EVENT_ID)).thenReturn(capacity);

        PanacheQuery queryMock = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) queryMock);
        when(queryMock.list()).thenReturn(List.of());

        // WHEN
        service.cancel(regId, STUDENT_ID);

        // THEN
        assertEquals(RegistrationStatus.CANCELLED, reg.getStatus());
        verify(eventPublisher).publishCancelled(any(), any(), any(), anyInt());
    }

    @Test
    @DisplayName("Register: Should handle 404 from Event Service")
    void testRegisterEventNotFound() {
        PanacheMock.mock(Registration.class);

        PanacheQuery<Registration> queryMock = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) queryMock);
        when(queryMock.firstResultOptional()).thenReturn(Optional.empty());

        CreateRegistrationRequest req = new CreateRegistrationRequest();
        req.setEventId(EVENT_ID);

        WebApplicationException remoteEx = new WebApplicationException(Response.status(404).build());
        when(eventClient.getEvent(EVENT_ID)).thenThrow(remoteEx);

        WebApplicationException ex = assertThrows(WebApplicationException.class,
                () -> service.register(STUDENT_ID, req));
        assertEquals(404, ex.getResponse().getStatus());
        assertTrue(ex.getMessage().contains("catalogue"));
    }
}