package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.service.Auth0ManagementService;
import ch.unige.pinfo.user.service.UserSyncService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import io.restassured.http.ContentType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
class UserResourceTest {

        @InjectMock
        UserRepository userRepository;

        @InjectMock
        JsonWebToken jwt;

        @InjectMock
        UserSyncService userSyncService;

        @InjectMock
        Auth0ManagementService auth0ManagementService;

        // On fixe l'id du owner pour avoir des tests déterministes
        private static final UUID OWNER_ID = UUID.randomUUID();
        private static final String AUTH0_OWNER = "auth0|owner-123";
        private static final String AUTH0_OTHER = "auth0|other-456";
        private static final String AUTH0_ADMIN = "auth0|admin-789";

        private User makeUser(UUID id, String auth0Id, String email, String name, String role) {
                User u = new User();
                u.id = id;
                u.auth0Id = auth0Id;
                u.setEmail(email);
                u.setName(name);
                u.setRole(role);
                u.active = true;
                return u;
        }

        @BeforeEach
        void setUp() {
                // prevent UserSyncFilter from doing real DB work during tests
                doNothing().when(userSyncService).syncUser();
                doNothing().when(auth0ManagementService).deleteUser(any(String.class));
        }

        // ── GET /api/users/{userId} ───────────────────────────────────────────

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void getUser_existingUser_returns200() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                // PINFO-193 IDOR fix: caller must be either the owner or an Admin.
                // Mocking jwt.getSubject() so the resource sees this caller as the owner.
                when(jwt.getSubject()).thenReturn(AUTH0_OWNER);

                given()
                                .when().get("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(200)
                                .body("name", equalTo("Alice"))
                                .body("email", equalTo("alice@unige.ch"))
                                .body("id", equalTo(OWNER_ID.toString()));
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void getUser_inactiveUser_returns404() {
                User inactive = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                inactive.active = false;
                when(userRepository.findById(OWNER_ID)).thenReturn(inactive);

                given()
                                .when().get("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(404);
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void getUser_nonExistentUser_returns404() {
                when(userRepository.findById(any(UUID.class))).thenReturn(null);

                given()
                                .when().get("/api/users/{id}", UUID.randomUUID())
                                .then()
                                .statusCode(404);
        }

        @Test
        void getUser_unauthenticated_returns401() {
                given()
                                .when().get("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(401);
        }

        @Test
        @TestSecurity(user = AUTH0_OTHER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OTHER)
        })
        void getUser_asOtherStudent_returns403() {
                // PINFO-193 IDOR fix: a non-owner non-Admin caller cannot read another
                // user's profile, even when authenticated.
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OTHER);

                given()
                                .when().get("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(403);
        }

        @Test
        @TestSecurity(user = AUTH0_ADMIN, roles = "ADMIN")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ADMIN)
        })
        void getUser_asAdmin_canReadAnyone_returns200() {
                // PINFO-193 IDOR fix: Admin role is the only escape hatch.
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_ADMIN);
                when(userSyncService.getRoleFromJwt()).thenReturn("ADMIN");

                given()
                                .when().get("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(200);
        }

        // ── PUT /api/users/{userId} ───────────────────────────────────────────

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void updateUser_asOwner_returns200() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OWNER);

                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Alice Updated\"}")
                                .when().put("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(200)
                                .body("name", equalTo("Alice Updated"));
        }

        @Test
        @TestSecurity(user = AUTH0_OTHER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OTHER)
        })
        void updateUser_asNonOwner_returns403() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OTHER);

                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Hacked\"}")
                                .when().put("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(403);
        }

        @Test
        void updateUser_unauthenticated_returns401() {
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Alice Updated\"}")
                                .when().put("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(401);
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void updateUser_nonExistentUser_returns404() {
                when(userRepository.findById(any(UUID.class))).thenReturn(null);

                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Ghost\"}")
                                .when().put("/api/users/{id}", UUID.randomUUID())
                                .then()
                                .statusCode(404);
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void updateUser_nullAvatarUrl_preservesExistingAvatar() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                owner.avatarUrl = "https://s.gravatar.com/avatar/existing";
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OWNER);

                // avatarUrl absent from payload → must keep existing value
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Alice Updated\"}")
                                .when().put("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(200)
                                .body("name", equalTo("Alice Updated"));

                verify(userRepository).persist(
                                argThat((User u) -> "https://s.gravatar.com/avatar/existing".equals(u.avatarUrl)));
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void updateUser_auth0CdnAvatarUrl_returns200() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OWNER);

                // Auth0 CDN URL — must now pass the whitelist pattern
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Alice\", \"avatarUrl\": \"https://cdn.auth0.com/avatars/al.png\"}")
                                .when().put("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(200);
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void updateUser_gravatarSSubdomain_returns200() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OWNER);

                // s.gravatar.com — used by Auth0 for default avatars
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Alice\", \"avatarUrl\": \"https://s.gravatar.com/avatar/abc123\"}")
                                .when().put("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(200);
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void updateUser_arbitraryExternalUrl_returns400() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OWNER);

                // Random external host — must be rejected by the whitelist
                given()
                                .contentType(ContentType.JSON)
                                .body("{\"name\": \"Alice\", \"avatarUrl\": \"https://attacker.example/track.png\"}")
                                .when().put("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(400);
        }

        // ── DELETE /api/users/{userId} ────────────────────────────────────────

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void deleteUser_asOwner_returns204() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OWNER);
                when(userSyncService.getRoleFromJwt()).thenReturn("Student");

                given()
                                .when().delete("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(204);

                // verify soft delete — active set to false, persisted
                verify(userRepository).persist(argThat((User u) -> !u.active
                                && u.email.startsWith("alice@unige.ch-deleted-")
                                && u.auth0Id.startsWith("auth0|owner-123-deleted-")));
                verify(auth0ManagementService).deleteUser(AUTH0_OWNER);
        }

        @Test
        @TestSecurity(user = AUTH0_OTHER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OTHER)
        })
        void deleteUser_asNonOwner_returns403() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_OTHER);
                when(userSyncService.getRoleFromJwt()).thenReturn("Student");

                given()
                                .when().delete("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(403);

                verify(auth0ManagementService, never()).deleteUser(any(String.class));
        }

        @Test
        @TestSecurity(user = AUTH0_ADMIN, roles = "ADMIN")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_ADMIN)
        })
        void deleteUser_asAdmin_canDeleteAnyone_returns204() {
                User owner = makeUser(OWNER_ID, AUTH0_OWNER, "alice@unige.ch", "Alice", "STUDENT");
                when(userRepository.findById(OWNER_ID)).thenReturn(owner);
                when(jwt.getSubject()).thenReturn(AUTH0_ADMIN);
                when(userSyncService.getRoleFromJwt()).thenReturn("ADMIN");

                given()
                                .when().delete("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(204);

                verify(auth0ManagementService).deleteUser(AUTH0_OWNER);
                verify(userRepository).persist(argThat((User u) -> !u.active
                                && u.email.startsWith("alice@unige.ch-deleted-")
                                && u.auth0Id.startsWith("auth0|owner-123-deleted-")));
        }

        @Test
        void deleteUser_unauthenticated_returns401() {
                given()
                                .when().delete("/api/users/{id}", OWNER_ID)
                                .then()
                                .statusCode(401);

                verify(auth0ManagementService, never()).deleteUser(any(String.class));
        }

        @Test
        @TestSecurity(user = AUTH0_OWNER, roles = "STUDENT")
        @JwtSecurity(claims = {
                        @Claim(key = "sub", value = AUTH0_OWNER)
        })
        void deleteUser_nonExistentUser_returns404() {
                when(userRepository.findById(any(UUID.class))).thenReturn(null);
                when(userSyncService.getRoleFromJwt()).thenReturn("Student");

                given()
                                .when().delete("/api/users/{id}", UUID.randomUUID())
                                .then()
                                .statusCode(404);

                verify(auth0ManagementService, never()).deleteUser(any(String.class));
        }
}