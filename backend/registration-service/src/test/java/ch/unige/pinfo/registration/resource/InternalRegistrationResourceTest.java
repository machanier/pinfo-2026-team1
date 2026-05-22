package ch.unige.pinfo.registration.resource;

import ch.unige.pinfo.registration.model.Registration;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@QuarkusTest
class InternalRegistrationResourceTest {

    private static final UUID EVENT_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Test
    @DisplayName("Participants: Should return only non-blank student IDs")
    void getParticipants_filtersBlankAndNullIds() {
        // GIVEN
        PanacheMock.mock(Registration.class);
        PanacheQuery<Registration> query = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) query);

        Registration reg1 = new Registration();
        reg1.setStudentId("auth0|student-1");
        Registration reg2 = new Registration();
        reg2.setStudentId("");
        Registration reg3 = new Registration();
        reg3.setStudentId(null);
        Registration reg4 = new Registration();
        reg4.setStudentId("auth0|student-2");

        when(query.list()).thenReturn(List.of(reg1, reg2, reg3, reg4));

        // WHEN/THEN
        given()
                .when()
                .get("/internal/events/" + EVENT_ID + "/registrations/participants")
                .then()
                .statusCode(200)
                .body("", hasSize(2))
                .body("[0]", equalTo("auth0|student-1"))
                .body("[1]", equalTo("auth0|student-2"));
    }

    @Test
    @DisplayName("Participants: Should return empty list when no registrations")
    void getParticipants_returnsEmptyList() {
        // GIVEN
        PanacheMock.mock(Registration.class);
        PanacheQuery<Registration> query = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) query);
        when(query.list()).thenReturn(List.of());

        // WHEN/THEN
        given()
                .when()
                .get("/internal/events/" + EVENT_ID + "/registrations/participants")
                .then()
                .statusCode(200)
                .body("", hasSize(0));
    }

    @Test
    @DisplayName("Confirmed: Should return only non-blank student IDs")
    void getConfirmed_filtersBlankAndNullIds() {
        // GIVEN
        PanacheMock.mock(Registration.class);
        PanacheQuery<Registration> query = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) query);

        Registration reg1 = new Registration();
        reg1.setStudentId("auth0|student-1");
        Registration reg2 = new Registration();
        reg2.setStudentId("");
        Registration reg3 = new Registration();
        reg3.setStudentId(null);

        when(query.list()).thenReturn(List.of(reg1, reg2, reg3));

        // WHEN/THEN
        given()
                .when()
                .get("/internal/events/" + EVENT_ID + "/registrations/confirmed")
                .then()
                .statusCode(200)
                .body("", hasSize(1))
                .body("[0]", equalTo("auth0|student-1"));
    }

    @Test
    @DisplayName("Confirmed: Should return empty list when no registrations")
    void getConfirmed_returnsEmptyList() {
        // GIVEN
        PanacheMock.mock(Registration.class);
        PanacheQuery<Registration> query = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) query);
        when(query.list()).thenReturn(List.of());

        // WHEN/THEN
        given()
                .when()
                .get("/internal/events/" + EVENT_ID + "/registrations/confirmed")
                .then()
                .statusCode(200)
                .body("", hasSize(0));
    }
}
