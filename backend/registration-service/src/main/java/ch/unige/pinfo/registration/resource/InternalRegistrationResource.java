package ch.unige.pinfo.registration.resource;

import ch.unige.pinfo.registration.model.Registration;
import ch.unige.pinfo.registration.openapi.api.InternalApi;
import ch.unige.pinfo.registration.openapi.model.RegistrationStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/internal/events/{eventId}/registrations")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class InternalRegistrationResource implements InternalApi {

	// Get all students that are either CONFIRMED registered or WAITLISTED for an
	// event to use in notification service
	@Override
	@GET
	@Path("/participants")
	public List<UUID> internalEventsEventIdRegistrationsParticipantsGet(@PathParam("eventId") UUID eventId) {
		List<RegistrationStatus> statuses = List.of(RegistrationStatus.CONFIRMED, RegistrationStatus.WAITLISTED);
		List<Registration> registrations = Registration.find("eventId = ?1 and status in ?2", eventId, statuses)
				.list();
		return registrations.stream()
				.map(Registration::getStudentId)
				.filter(studentId -> studentId != null)
				.collect(Collectors.toList());
	}

	@Override
	@GET
	@Path("/confirmed")
	public List<UUID> internalEventsEventIdRegistrationsConfirmedGet(@PathParam("eventId") UUID eventId) {
		List<Registration> registrations = Registration.find(
				"eventId = ?1 and status = ?2",
				eventId,
				RegistrationStatus.CONFIRMED)
				.list();
		return registrations.stream()
				.map(Registration::getStudentId)
				.filter(studentId -> studentId != null)
				.collect(Collectors.toList());
	}
}
