package ch.unige.pinfo.registration.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.mockito.InjectSpy;
import io.quarkus.test.InjectMock;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class RegistrationEventPublisherTest {

	@Inject
	RegistrationEventPublisher publisher;

	@InjectMock
	@Channel("registration-confirmed")
	Emitter<String> confirmedEmitter;

	@InjectMock
	@Channel("registration-waitlisted")
	Emitter<String> waitlistedEmitter;

	@InjectMock
	@Channel("registration-cancelled")
	Emitter<String> cancelledEmitter;

	@InjectSpy
	ObjectMapper objectMapper;

	@Test
	@DisplayName("publishConfirmed should serialize parameters and emit a valid JSON payload")
	void testPublishConfirmedSuccess() throws Exception {
		UUID registrationId = UUID.randomUUID();
		UUID eventId = UUID.randomUUID();
		UUID studentId = UUID.randomUUID();
		ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);

		publisher.publishConfirmed(registrationId, eventId, studentId);

		verify(confirmedEmitter).send(payloadCaptor.capture());

		Map<?, ?> result = objectMapper.readValue(payloadCaptor.getValue(), Map.class);
		assertEquals(registrationId.toString(), result.get("registrationId"));
		assertEquals(eventId.toString(), result.get("eventId"));
		assertEquals(studentId.toString(), result.get("studentId"));
	}

	@Test
	@DisplayName("publishWaitlisted should serialize parameters and include waitlist position")
	void testPublishWaitlistedSuccess() throws Exception {
		UUID registrationId = UUID.randomUUID();
		UUID eventId = UUID.randomUUID();
		UUID studentId = UUID.randomUUID();
		int position = 3;
		ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);

		publisher.publishWaitlisted(registrationId, eventId, studentId, position);

		verify(waitlistedEmitter).send(payloadCaptor.capture());

		Map<?, ?> result = objectMapper.readValue(payloadCaptor.getValue(), Map.class);
		assertEquals(registrationId.toString(), result.get("registrationId"));
		assertEquals(position, result.get("waitlistPosition"));
	}

	@Test
	@DisplayName("publishCancelled should serialize parameters and list of waitlisted students")
	void testPublishCancelledSuccess() throws Exception {
		UUID registrationId = UUID.randomUUID();
		UUID eventId = UUID.randomUUID();
		UUID studentId = UUID.randomUUID();
		List<UUID> waitlistedIds = List.of(UUID.randomUUID(), UUID.randomUUID());
		int slots = 5;
		ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);

		publisher.publishCancelled(registrationId, eventId, waitlistedIds, studentId, slots);

		verify(cancelledEmitter).send(payloadCaptor.capture());

		Map<?, ?> result = objectMapper.readValue(payloadCaptor.getValue(), Map.class);
		assertEquals(registrationId.toString(), result.get("registrationId"));
		assertEquals(slots, result.get("availableSlots"));

		List<?> parsedWaitlist = (List<?>) result.get("waitlistedStudentIds");
		assertEquals(2, parsedWaitlist.size());
	}

	@Test
	@DisplayName("Should gracefully catch and log exceptions if serialization fails")
	void testPublishMethodsWithExceptionHandling() throws JsonProcessingException {
		doThrow(new RuntimeException("Simulated JSON Mapping Failure"))
				.when(objectMapper).writeValueAsString(any());

		assertDoesNotThrow(() -> publisher.publishConfirmed(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID()));
		assertDoesNotThrow(
				() -> publisher.publishWaitlisted(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1));
		assertDoesNotThrow(() -> publisher.publishCancelled(UUID.randomUUID(), UUID.randomUUID(), List.of(),
				UUID.randomUUID(), 0));

		verifyNoInteractions(confirmedEmitter);
		verifyNoInteractions(waitlistedEmitter);
		verifyNoInteractions(cancelledEmitter);
	}
}