package ch.unige.pinfo.moderation.resource;

import ch.unige.pinfo.moderation.messaging.ModerationPublisher;
import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@QuarkusTest
class DecisionsResourceTest {

	@Inject
	ModerationCaseRepository caseRepository;

	@InjectMock
	@Inject
	ModerationPublisher moderationPublisher;

	@BeforeEach
	@Transactional
	void setUp() {
		caseRepository.deleteAll();
	}

	@Test
	@TestSecurity(user = "admin", roles = "ADMIN")
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
	@TestSecurity(user = "admin", roles = "ADMIN")
	void approvePendingAnnouncementCase_publishesAnnouncementDecision() {
		UUID announcementId = UUID.randomUUID();
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING, announcementId);

		given()
				.contentType(ContentType.JSON)
				.body("{\"adminNote\":\"Ok\"}")
				.when().patch("/api/moderation/queue/{caseId}/approve", pendingCase.caseId)
				.then()
				.statusCode(200)
				.body("status", equalTo("APPROVED"));

		verify(moderationPublisher).sendAnnouncementDecision(eq(announcementId), eq("APPROVED"));
	}

	@Test
	@TestSecurity(user = "admin", roles = "ADMIN")
	void rejectPendingAnnouncementCase_publishesAnnouncementDecision() {
		UUID announcementId = UUID.randomUUID();
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING, announcementId);

		given()
				.contentType(ContentType.JSON)
				.body("{\"reason\":\"Needs changes\"}")
				.when().patch("/api/moderation/queue/{caseId}/reject", pendingCase.caseId)
				.then()
				.statusCode(200)
				.body("status", equalTo("REJECTED"));

		verify(moderationPublisher).sendAnnouncementDecision(eq(announcementId), eq("REJECTED"));
	}

	@Test
	@TestSecurity(user = "admin", roles = "ADMIN")
	void approvePending_publishFails_returns502() {
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING);
		doThrow(new IllegalStateException("Failed to publish moderation decision"))
			.when(moderationPublisher).sendEventDecision(any(), anyString(), any());

		given()
				.contentType(ContentType.JSON)
				.body("{\"adminNote\":\"Ok\"}")
				.when().patch("/api/moderation/queue/{caseId}/approve", pendingCase.caseId)
				.then()
				.statusCode(502)
				.body("message", equalTo("Failed to publish moderation decision"));
	}

	@Test
	@TestSecurity(user = "admin", roles = "ADMIN")
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
	@TestSecurity(user = "admin", roles = "ADMIN")
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
	@TestSecurity(user = "admin", roles = "ADMIN")
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
	@TestSecurity(user = "admin", roles = "ADMIN")
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
	@TestSecurity(user = "admin", roles = "ADMIN")
	void approveMissingCase_returns404() {
		UUID missingId = UUID.randomUUID();

		given()
				.contentType(ContentType.JSON)
				.body("{\"adminNote\":\"Ok\"}")
				.when().patch("/api/moderation/queue/{caseId}/approve", missingId)
				.then()
				.statusCode(404);
	}

	    @Test
	    @TestSecurity(user = "admin", roles = "ADMIN")
	    void approvePendingAnnouncement_publishFails_returns502() {
		UUID announcementId = UUID.randomUUID();
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING, announcementId);
		doThrow(new IllegalStateException("Failed to publish announcement moderation decision"))
			.when(moderationPublisher).sendAnnouncementDecision(any(), anyString());

		given()
			.contentType(ContentType.JSON)
			.body("{\"adminNote\":\"Ok\"}")
			.when().patch("/api/moderation/queue/{caseId}/approve", pendingCase.caseId)
			.then()
			.statusCode(502)
			.body("message", equalTo("Failed to publish announcement moderation decision"));
	    }

	    @Test
	    @TestSecurity(user = "admin", roles = "ADMIN")
	    void rejectPendingAnnouncement_publishFails_returns502() {
		UUID announcementId = UUID.randomUUID();
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING, announcementId);
		doThrow(new IllegalStateException("Failed to publish announcement moderation decision"))
			.when(moderationPublisher).sendAnnouncementDecision(any(), anyString());

		given()
			.contentType(ContentType.JSON)
			.body("{\"reason\":\"Needs changes\"}")
			.when().patch("/api/moderation/queue/{caseId}/reject", pendingCase.caseId)
			.then()
			.statusCode(502)
			.body("message", equalTo("Failed to publish announcement moderation decision"));
	    }

	    @Test
	    @TestSecurity(user = "admin", roles = "ADMIN")
	    void rejectPending_eventPublishFails_returns502() {
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING);
		doThrow(new IllegalStateException("Failed to publish moderation decision"))
			.when(moderationPublisher).sendEventDecision(any(), anyString(), any());

		given()
			.contentType(ContentType.JSON)
			.body("{\"reason\":\"Needs changes\"}")
			.when().patch("/api/moderation/queue/{caseId}/reject", pendingCase.caseId)
			.then()
			.statusCode(502)
			.body("message", equalTo("Failed to publish moderation decision"));
	    }

	    @Test
	    @TestSecurity(user = "admin", roles = "ADMIN")
	    void approvePending_noBody_adminNoteNull() {
		ModerationCase pendingCase = persistCase(ModerationStatus.PENDING);

		given()
			.when().patch("/api/moderation/queue/{caseId}/approve", pendingCase.caseId)
			.then()
			.statusCode(200)
			.body("adminNote", nullValue());

		ModerationCase updated = caseRepository.findById(pendingCase.caseId);
		org.junit.jupiter.api.Assertions.assertNull(updated.adminNote);
	    }

	@Transactional
	ModerationCase persistCase(ModerationStatus status) {
		return persistCase(status, null);
	}

	@Transactional
	ModerationCase persistCase(ModerationStatus status, UUID announcementId) {
		ModerationCase moderationCase = new ModerationCase();
		moderationCase.eventId = UUID.randomUUID();
		moderationCase.announcementId = announcementId;
		moderationCase.organizerId = UUID.randomUUID();
		moderationCase.title = "Test event";
		moderationCase.status = status;
		moderationCase.createdAt = OffsetDateTime.now();
		caseRepository.persist(moderationCase);
		return moderationCase;
	}
}
