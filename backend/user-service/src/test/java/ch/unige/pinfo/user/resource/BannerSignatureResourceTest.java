package ch.unige.pinfo.user.resource;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.Mockito.when;

@QuarkusTest
class BannerSignatureResourceTest {

    @InjectMock
    JsonWebToken jwt;

    private static final String PATH = "/api/users/me/banner-upload-signature";

    @Test
    void unauthenticated_returns401() {
        given().when().post(PATH).then().statusCode(401);
    }

    @Test
    @TestSecurity(user = "auth0|ban-ok", roles = "ORGANIZER")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|ban-ok") })
    void organizer_returnsSignedBannerPayload() {
        when(jwt.getSubject()).thenReturn("auth0|ban-ok");

        given()
                .when().post(PATH)
                .then()
                .statusCode(200)
                .body("cloudName", equalTo("test-cloud"))
                .body("apiKey", equalTo("test-api-key"))
                .body("uploadPreset", equalTo("unigevents_banner"))
                .body("overwrite", equalTo(true))
                .body("timestamp", notNullValue())
                .body("signature", notNullValue())
                // Banner public_id is unique per request, namespaced under the user.
                .body("publicId", startsWith("banners/auth0_ban-ok/"));
    }

    @Test
    @TestSecurity(user = "auth0|ban-student", roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|ban-student") })
    void student_isForbidden() {
        when(jwt.getSubject()).thenReturn("auth0|ban-student");

        // Banners are an organizer/admin concern; a STUDENT identity is rejected
        // by @RolesAllowed before our code runs.
        given().when().post(PATH).then().statusCode(403);
    }

    @Test
    @TestSecurity(user = "auth0|ban-rl", roles = "ORGANIZER")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|ban-rl") })
    void exceedingPerUserRateLimit_returns429() {
        when(jwt.getSubject()).thenReturn("auth0|ban-rl");

        // Test config caps at 3 per window; the 4th call is throttled.
        for (int i = 0; i < 3; i++) {
            given().when().post(PATH).then().statusCode(200);
        }
        given().when().post(PATH).then().statusCode(429);
    }
}
