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
    private static final UUID STUDENT_ID_1 = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID STUDENT_ID_2 = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    @DisplayName("Participants: Should return only non-null student IDs")
    void getParticipants_filtersNullIds() {
        // GIVEN
        PanacheMock.mock(Registration.class);
        PanacheQuery<Registration> query = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) query);

        Registration reg1 = new Registration();
        reg1.setStudentId(STUDENT_ID_1);

        Registration reg2 = new Registration();
        reg2.setStudentId(null);

        Registration reg3 = new Registration();
        reg3.setStudentId(STUDENT_ID_2);

        when(query.list()).thenReturn(List.of(reg1, reg2, reg3));

        // WHEN/THEN
        given()
                .when()
                .get("/internal/events/" + EVENT_ID + "/registrations/participants")
                .then()
                .statusCode(200)
                .body("", hasSize(2))
                .body("[0]", equalTo(STUDENT_ID_1.toString()))
                .body("[1]", equalTo(STUDENT_ID_2.toString()));
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
    @DisplayName("Confirmed: Should return only non-null student IDs")
    void getConfirmed_filtersNullIds() {
        // GIVEN
        PanacheMock.mock(Registration.class);
        PanacheQuery<Registration> query = mock(PanacheQuery.class);
        when(Registration.find(anyString(), any(Object[].class))).thenReturn((PanacheQuery) query);

        Registration reg1 = new Registration();
        reg1.setStudentId(STUDENT_ID_1);

        Registration reg2 = new Registration();
        reg2.setStudentId(null);

        when(query.list()).thenReturn(List.of(reg1, reg2));

        // WHEN/THEN
        given()
                .when()
                .get("/internal/events/" + EVENT_ID + "/registrations/confirmed")
                .then()
                .statusCode(200)
                .body("", hasSize(1))
                .body("[0]", equalTo(STUDENT_ID_1.toString()));
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