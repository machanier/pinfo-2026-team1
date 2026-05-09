package ch.unige.pinfo.moderation.resource;

import ch.unige.pinfo.moderation.event.EventServiceClient;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@QuarkusTest
class DecisionsResourceTest {

	@Inject
	ModerationCaseRepository caseRepository;

	@InjectMock
	@RestClient
	EventServiceClient eventServiceClient;

	@BeforeEach
	@Transactional
	void setUp() {
		caseRepository.deleteAll();
		when(eventServiceClient.publishEvent(any(), anyString())).thenReturn(Response.ok().build());
	}

	@Test
	@TestSecurity(user = "admin", roles = "Admin")
	void approvePending_updatesCaseAndReturns200() {
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING);

		given()
				.contentType(ContentType.JSON)
				.body("{\"adminNote\":\"Looks good\"}")
				.when().patch("/api/moderation/queue/{caseId}/approve", pendingCase.caseId)
				.then()
				.statusCode(200)
				.body("caseId", equalTo(pendingCase.caseId.toString()))
				.body("status", equalTo("APPROVED"))
				.body("adminNote", equalTo("Looks good"))
				.body("decidedAt", notNullValue());

		ModerationCase updated = caseRepository.findById(pendingCase.caseId);
		org.junit.jupiter.api.Assertions.assertEquals(ModerationStatus.APPROVED, updated.status);
		org.junit.jupiter.api.Assertions.assertNotNull(updated.decidedAt);
	}

	@Test
	@TestSecurity(user = "admin", roles = "Admin")
	void approvePending_publishFails_returns502() {
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING);
		when(eventServiceClient.publishEvent(any(), anyString()))
				.thenReturn(Response.status(Response.Status.SERVICE_UNAVAILABLE).build());

		given()
				.contentType(ContentType.JSON)
				.body("{\"adminNote\":\"Ok\"}")
				.when().patch("/api/moderation/queue/{caseId}/approve", pendingCase.caseId)
				.then()
				.statusCode(502)
				.body("message", equalTo("Failed to publish event"));
	}

	@Test
	@TestSecurity(user = "admin", roles = "Admin")
	void approveNonPending_returns409() {
		ModerationCase rejectedCase = persistCase(ModerationStatus.REJECTED);

		given()
				.contentType(ContentType.JSON)
				.body("{\"adminNote\":\"Ok\"}")
				.when().patch("/api/moderation/queue/{caseId}/approve", rejectedCase.caseId)
				.then()
				.statusCode(409)
				.body("message", equalTo("Case is not in PENDING status"));
	}

	@Test
	@TestSecurity(user = "admin", roles = "Admin")
	void rejectPending_updatesCaseAndReturns200() {
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING);

		given()
				.contentType(ContentType.JSON)
				.body("{\"reason\":\"Needs changes\"}")
				.when().patch("/api/moderation/queue/{caseId}/reject", pendingCase.caseId)
				.then()
				.statusCode(200)
				.body("caseId", equalTo(pendingCase.caseId.toString()))
				.body("status", equalTo("REJECTED"))
				.body("rejectionReason", equalTo("Needs changes"))
				.body("decidedAt", notNullValue());

		ModerationCase updated = caseRepository.findById(pendingCase.caseId);
		org.junit.jupiter.api.Assertions.assertEquals(ModerationStatus.REJECTED, updated.status);
		org.junit.jupiter.api.Assertions.assertEquals("Needs changes", updated.rejectionReason);
	}

	@Test
	@TestSecurity(user = "admin", roles = "Admin")
	void rejectMissingReason_returns400() {
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING);

		given()
				.contentType(ContentType.JSON)
				.body("{}")
				.when().patch("/api/moderation/queue/{caseId}/reject", pendingCase.caseId)
				.then()
				.statusCode(400);
	}

	@Test
	@TestSecurity(user = "admin", roles = "Admin")
	void rejectNonPending_returns409() {
		ModerationCase approvedCase = persistCase(ModerationStatus.APPROVED);

		given()
				.contentType(ContentType.JSON)
				.body("{\"reason\":\"No\"}")
				.when().patch("/api/moderation/queue/{caseId}/reject", approvedCase.caseId)
				.then()
				.statusCode(409)
				.body("message", equalTo("Case is not in PENDING status"));
	}

	@Test
	@TestSecurity(user = "admin", roles = "Admin")
	void approveMissingCase_returns404() {
		UUID missingId = UUID.randomUUID();

		given()
				.contentType(ContentType.JSON)
				.body("{\"adminNote\":\"Ok\"}")
				.when().patch("/api/moderation/queue/{caseId}/approve", missingId)
				.then()
				.statusCode(404);
	}

	@Transactional
	ModerationCase persistCase(ModerationStatus status) {
		ModerationCase moderationCase = new ModerationCase();
		moderationCase.eventId = UUID.randomUUID();
		moderationCase.organizerId = UUID.randomUUID();
		moderationCase.title = "Test event";
		moderationCase.status = status;
		moderationCase.createdAt = OffsetDateTime.now();
		caseRepository.persist(moderationCase);
		return moderationCase;
	}
}
