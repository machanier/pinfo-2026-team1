package ch.unige.pinfo.notification.resource;

import ch.unige.pinfo.notification.model.NotificationPreference;
import ch.unige.pinfo.notification.openapi.model.NotificationPreferences;
import ch.unige.pinfo.notification.repository.NotificationPreferenceRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import io.restassured.http.ContentType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;

@QuarkusTest
class PreferencesResourceTest {

        @InjectMock
        NotificationPreferenceRepository preferenceRepository;

        @InjectMock
        JsonWebToken jwt;

        private UUID userId;
        private NotificationPreference existingPreference;

        private static final String BASE_PATH = "/api/notifications/preferences";

        @BeforeEach
        void setUp() {
                userId = UUID.randomUUID();

                Mockito.when(jwt.getSubject()).thenReturn(userId.toString());

                existingPreference = new NotificationPreference();
                existingPreference.userId = userId;
                existingPreference.emailEnabled = true;
                existingPreference.emailOnAnnouncement = true;
                existingPreference.emailOnEventUpdate = true;
                existingPreference.emailOnEventCancellation = true;
                existingPreference.emailOnRegistrationConfirmed = true;
                existingPreference.emailOnFreeSlot = true;
                existingPreference.reminderLeadTimeHours = 24;
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsPreferencesGet_Existing() {
                Mockito.when(preferenceRepository.findById(userId)).thenReturn(existingPreference);

                given()
                                .when().get(BASE_PATH)
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("emailEnabled", is(true))
                                .body("reminderLeadTimeHours", is(24));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsPreferencesGet_DefaultsCreatedIfNoneExist() {
                Mockito.when(preferenceRepository.findById(userId)).thenReturn(null);

                given()
                                .when().get(BASE_PATH)
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body(notNullValue());

                // Verify that default preferences were persisted
                Mockito.verify(preferenceRepository).persist(any(NotificationPreference.class));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsPreferencesPatch_ValidUpdate() {
                Mockito.when(preferenceRepository.findById(userId)).thenReturn(existingPreference);

                NotificationPreferences updatePayload = new NotificationPreferences()
                                .emailEnabled(false)
                                .reminderLeadTimeHours(12);

                given()
                                .contentType(ContentType.JSON)
                                .body(updatePayload)
                                .when().patch(BASE_PATH)
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("emailEnabled", is(false)) // Updated
                                .body("reminderLeadTimeHours", is(12)) // Updated
                                .body("emailOnAnnouncement", is(true)); // Retained previous value

                Mockito.verify(preferenceRepository).persist(existingPreference);
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsPreferencesPatch_DefaultsCreatedBeforeUpdate() {
                // Find returns null, so defaults should be created before applying patch
                Mockito.when(preferenceRepository.findById(userId)).thenReturn(null);

                NotificationPreferences updatePayload = new NotificationPreferences()
                                .emailOnEventCancellation(false);

                given()
                                .contentType(ContentType.JSON)
                                .body(updatePayload)
                                .when().patch(BASE_PATH)
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("emailOnEventCancellation", is(false));

                Mockito.verify(preferenceRepository).persist(any(NotificationPreference.class));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsPreferencesPatch_NegativeReminderLeadTime() {
                Mockito.when(preferenceRepository.findById(userId)).thenReturn(existingPreference);

                NotificationPreferences updatePayload = new NotificationPreferences()
                                .reminderLeadTimeHours(-5); // Invalid value

                given()
                                .contentType(ContentType.JSON)
                                .body(updatePayload)
                                .when().patch(BASE_PATH)
                                .then()
                                .statusCode(400); // Expecting BadRequestException mapping
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testMissingJwtSubject_ThrowsNotAuthorized() {
                // Return null subject
                Mockito.when(jwt.getSubject()).thenReturn(null);

                given()
                                .when().get(BASE_PATH)
                                .then()
                                .statusCode(401);
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testFallbackForNonUuidSubject() {
                // If the subject is not a standard UUID format, it should fallback to
                // nameUUIDFromBytes
                String nonUuidSubject = "auth0|123456789";
                Mockito.when(jwt.getSubject()).thenReturn(nonUuidSubject);
                Mockito.when(preferenceRepository.findById(any(UUID.class))).thenReturn(existingPreference);

                given()
                                .when().get(BASE_PATH)
                                .then()
                                .statusCode(200);
        }

        @Test
        void testApiNotificationsPreferencesGet_Unauthorized() {
                // No @TestSecurity annotations, simulating an unauthenticated request
                given()
                                .when().get(BASE_PATH)
                                .then()
                                .statusCode(401);
        }

}