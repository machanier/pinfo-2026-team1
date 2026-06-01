package ch.unige.pinfo.event.cloudinary;

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
 * Boot guard: empty {@code cloudinary.*} config (the unset-secret case) must
 * not crash event-service. The shared {@code CloudinarySignatureService} uses
 * {@code Optional<String>} injection so the bean still starts; the banner
 * signature endpoint then answers 503 ("not configured") instead of
 * CrashLoopBackOff. Mirrors the equivalent guard on user-service (avatar),
 * pinned at the new home of the banner endpoint.
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
                    "cloudinary.banner-upload-preset", "");
        }
    }

    @Test
    @TestSecurity(user = "auth0|boot", roles = "ORGANIZER")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|boot") })
    void startsWithEmptyConfigAndReturns503() {
        when(jwt.getSubject()).thenReturn("auth0|boot");

        given().when().post("/api/events/banner-upload-signature").then().statusCode(503);
    }
}
