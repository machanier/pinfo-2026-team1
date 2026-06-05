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
import static org.mockito.Mockito.when;

@QuarkusTest
class AvatarSignatureResourceTest {

    @InjectMock
    JsonWebToken jwt;

    private static final String PATH = "/api/users/me/avatar-upload-signature";

    @Test
    void unauthenticated_returns401() {
        // No @TestSecurity → no identity → @RolesAllowed rejects before our code.
        given()
                .when().post(PATH)
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = "auth0|sig-ok", roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|sig-ok") })
    void authenticated_returnsSignedPayloadPinnedToTheUser() {
        when(jwt.getSubject()).thenReturn("auth0|sig-ok");

        given()
                .when().post(PATH)
                .then()
                .statusCode(200)
                .body("cloudName", equalTo("test-cloud"))
                .body("apiKey", equalTo("test-api-key"))
                .body("uploadPreset", equalTo("unigevents_profil"))
                .body("overwrite", equalTo(true))
                .body("timestamp", notNullValue())
                .body("signature", notNullValue())
                // The subject's '|' is sanitised to '_' and pinned under avatars/,
                // so replaying a signature only ever overwrites this user's asset.
                .body("publicId", equalTo("avatars/auth0_sig-ok"));
    }

    @Test
    @TestSecurity(user = "auth0|sig-blank", roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|sig-blank") })
    void blankSubject_returns401() {
        when(jwt.getSubject()).thenReturn("  ");

        given()
                .when().post(PATH)
                .then()
                .statusCode(401);
    }

    @Test
    @TestSecurity(user = "auth0|sig-rl", roles = "STUDENT")
    @JwtSecurity(claims = { @Claim(key = "sub", value = "auth0|sig-rl") })
    void exceedingPerUserRateLimit_returns429() {
        when(jwt.getSubject()).thenReturn("auth0|sig-rl");

        // Test config caps at 3 signatures per window; the 4th call is throttled.
        for (int i = 0; i < 3; i++) {
            given().when().post(PATH).then().statusCode(200);
        }
        given().when().post(PATH).then().statusCode(429);
    }
}
