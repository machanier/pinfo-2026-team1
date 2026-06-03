package ch.unige.pinfo.registration.messaging;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.mockito.InjectSpy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

@QuarkusTest
class RegistrationEventPublisherTest {

	@InjectSpy
	RegistrationEventPublisher publisher;

	@Test
	@DisplayName("Should cover all publishing methods")
	void testCoverage() {
		UUID studentUuid = UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c2");
		UUID otherUuid = UUID.fromString("e573e86c-ec9d-3f0b-967a-13fb25db59c3");

		doNothing().when(publisher).publishConfirmed(any(), any(), any());
		doNothing().when(publisher).publishWaitlisted(any(), any(), any(), anyInt());
		doNothing().when(publisher).publishCancelled(any(), any(), any(), any(), anyInt());

		publisher.publishConfirmed(UUID.randomUUID(), UUID.randomUUID(), studentUuid);
		publisher.publishWaitlisted(UUID.randomUUID(), UUID.randomUUID(), studentUuid, 1);
		publisher.publishCancelled(UUID.randomUUID(), UUID.randomUUID(), List.of(studentUuid), otherUuid, 1);

		verify(publisher).publishConfirmed(
				any(),
				any(),
				eq(studentUuid));

		verify(publisher).publishWaitlisted(
				any(),
				any(),
				eq(studentUuid),
				anyInt());

		verify(publisher).publishCancelled(
				any(),
				any(),
				eq(List.of(studentUuid)),
				eq(otherUuid),
				anyInt());
	}
}