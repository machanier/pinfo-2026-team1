package ch.unige.pinfo.moderation.resource;

import ch.unige.pinfo.moderation.model.ModerationCase;
import ch.unige.pinfo.moderation.model.ModerationFlag;
import ch.unige.pinfo.moderation.openapi.model.ModerationStatus;
import ch.unige.pinfo.moderation.repository.ModerationCaseRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class QueueResourceTest {

    @Inject
    ModerationCaseRepository caseRepository;

    @BeforeEach
    @Transactional
    void setUp() {
        caseRepository.deleteAll();
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void getCase_existing_returns200() {
        ModerationCase saved = persistCase(ModerationStatus.PENDING);

        given()
                .when().get("/api/moderation/queue/{caseId}", saved.caseId)
                .then()
                .statusCode(200)
                .body("caseId", equalTo(saved.caseId.toString()))
                .body("status", equalTo("PENDING"))
                .body("flags", hasSize(1))
                .body("flags[0].field", equalTo("content"))
                .body("flags[0].reason", equalTo("Spam"))
                .body("createdAt", notNullValue());
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void getCase_missing_returns404() {
        given()
                .when().get("/api/moderation/queue/{caseId}", UUID.randomUUID())
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void deleteCase_existing_removesItAndReturns204() {
        ModerationCase saved = persistCase(ModerationStatus.PENDING);

        given()
                .when().delete("/api/moderation/queue/{caseId}", saved.caseId)
                .then()
                .statusCode(204);

        // The case (and its flags) are gone.
        given()
                .when().get("/api/moderation/queue/{caseId}", saved.caseId)
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void deleteCase_missing_returns404() {
        given()
                .when().delete("/api/moderation/queue/{caseId}", UUID.randomUUID())
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void listQueue_defaultStatusFiltersPending() {
        persistCase(ModerationStatus.PENDING);
        persistCase(ModerationStatus.PENDING);
        persistCase(ModerationStatus.APPROVED);

        given()
                .when().get("/api/moderation/queue")
                .then()
                .statusCode(200)
                .body("content", hasSize(2))
                .body("totalElements", equalTo(2))
                .body("page", equalTo(0))
                .body("size", equalTo(30));
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void listQueue_filtersByStatus() {
        persistCase(ModerationStatus.PENDING);
        persistCase(ModerationStatus.APPROVED);
        persistCase(ModerationStatus.APPROVED);

        given()
                .queryParam("status", "APPROVED")
                .when().get("/api/moderation/queue")
                .then()
                .statusCode(200)
                .body("content", hasSize(2))
                .body("totalElements", equalTo(2));
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void listQueue_paginatesResults() {
        persistCase(ModerationStatus.PENDING);
        persistCase(ModerationStatus.PENDING);
        persistCase(ModerationStatus.PENDING);

        given()
                .queryParam("page", 1)
                .queryParam("size", 2)
                .when().get("/api/moderation/queue")
                .then()
                .statusCode(200)
                .body("content", hasSize(1))
                .body("page", equalTo(1))
                .body("size", equalTo(2))
                .body("totalElements", equalTo(3))
                .body("totalPages", equalTo(2));
    }

    @Transactional
    ModerationCase persistCase(ModerationStatus status) {
        ModerationCase moderationCase = new ModerationCase();
        moderationCase.eventId = UUID.randomUUID();
        moderationCase.organizerId = UUID.randomUUID();
        moderationCase.title = "Test event";
        moderationCase.status = status;
        moderationCase.flags = List.of(new ModerationFlag("content", "Spam", 0.42f));
        moderationCase.createdAt = OffsetDateTime.now();
        caseRepository.persist(moderationCase);
        return moderationCase;
    }
}
