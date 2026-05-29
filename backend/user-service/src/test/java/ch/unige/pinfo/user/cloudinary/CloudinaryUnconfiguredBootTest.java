package ch.unige.pinfo.user.cloudinary;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.mockito.Mockito.when;

/**
 * Regression guard for the prod CrashLoopBackOff (PR #166 follow-up): empty
 * cloudinary.* config (the unset-secret case) used to make a required String
 * {@code @ConfigProperty} fail the whole boot. With {@code Optional<String>}
 * injection the service must START with empty config, and the signature endpoint
 * must answer 503 ("not configured") instead of crashing the JVM.
 *
 * <p>If the boot regresses, this test fails at Quarkus startup — exactly the
 * signal that was missing (the other @QuarkusTest classes pass because the test
 * application.properties ships non-empty dummy Cloudinary values).
 */
@QuarkusTest
@TestProfile(CloudinaryUnconfiguredBootTest.EmptyCloudinaryConfig.class)
class CloudinaryUnconfiguredBootTest {

    @InjectMock
    JsonWebToken jwt;

    public static class EmptyCloudinaryConfig implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            // Reproduce prod: every Cloudinary value resolves to empty.
            return Map.of(
                    "cloudinary.cloud-name", "",
                    "cloudinary.api-key", "",
                    "cloudinary.api-secret", "",
                    "cloudinary.upload-preset", "",
                    "cloudinary.banner-upload-preset", "");
        }
    }

    @Test
    @TestSecurity(user = "auth0|boot", roles = "ORGANIZER")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|boot") })
    void startsWithEmptyConfigAndReturns503() {
        when(jwt.getSubject()).thenReturn("auth0|boot");

        // Both signing endpoints must boot with empty config and answer 503
        // (ORGANIZER can reach both the avatar and the banner endpoint).
        given().when().post("/api/users/me/avatar-upload-signature").then().statusCode(503);
        given().when().post("/api/users/me/banner-upload-signature").then().statusCode(503);
    }
}
