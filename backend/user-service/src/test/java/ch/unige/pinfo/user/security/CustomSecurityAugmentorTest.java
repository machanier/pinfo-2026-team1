package ch.unige.pinfo.user.security;

import io.quarkus.security.identity.AuthenticationRequestContext;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;

import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CustomSecurityAugmentorTest {

        private CustomSecurityAugmentor augmentor;
        private AuthenticationRequestContext context;

        @BeforeEach
        void setUp() {
                augmentor = new CustomSecurityAugmentor();
                context = mock(AuthenticationRequestContext.class);
        }

        @Test
        void testAnonymousIdentityIsReturnedAsIs() {
                SecurityIdentity anonymousIdentity = mock(SecurityIdentity.class);
                when(anonymousIdentity.isAnonymous()).thenReturn(true);

                SecurityIdentity result = augmentor.augment(anonymousIdentity, context)
                                .await().indefinitely();

                assertSame(anonymousIdentity, result);
                verify(anonymousIdentity, never()).getPrincipal();
        }

        @Test
        void testRolesAreAddedFromJwtClaim() {
                JsonWebToken jwt = mock(JsonWebToken.class);
                when(jwt.getName()).thenReturn("auth0|123");
                when(jwt.getClaim("https://unigevents.com/roles"))
                                .thenReturn(List.of("Student", "Admin"));

                SecurityIdentity identity = QuarkusSecurityIdentity.builder()
                                .setPrincipal(jwt)
                                .build();

                SecurityIdentity result = augmentor.augment(identity, context)
                                .await().indefinitely();

                assertTrue(result.hasRole("STUDENT"));
                assertTrue(result.hasRole("ADMIN"));
        }

        @Test
        void testRolesWithQuotesAreStripped() {
                JsonWebToken jwt = mock(JsonWebToken.class);
                when(jwt.getName()).thenReturn("auth0|123");
                when(jwt.getClaim("https://unigevents.com/roles"))
                                .thenReturn(List.of("\"Student\""));

                SecurityIdentity identity = QuarkusSecurityIdentity.builder()
                                .setPrincipal(jwt)
                                .build();

                SecurityIdentity result = augmentor.augment(identity, context)
                                .await().indefinitely();

                assertTrue(result.hasRole("STUDENT"));
                assertFalse(result.hasRole("\"Student\""));
        }

        @Test
        void testNoRolesClaimReturnsOriginalIdentity() {
                JsonWebToken jwt = mock(JsonWebToken.class);
                when(jwt.getName()).thenReturn("auth0|123");
                when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);

                SecurityIdentity identity = QuarkusSecurityIdentity.builder()
                                .setPrincipal(jwt)
                                .build();

                SecurityIdentity result = augmentor.augment(identity, context)
                                .await().indefinitely();

                assertTrue(result.getRoles().isEmpty());
        }

        @Test
        void testNullRoleInCollectionIsIgnored() {
                JsonWebToken jwt = mock(JsonWebToken.class);
                when(jwt.getName()).thenReturn("auth0|123");
                when(jwt.getClaim("https://unigevents.com/roles"))
                                .thenReturn(List.of("Student"));

                SecurityIdentity identity = QuarkusSecurityIdentity.builder()
                                .setPrincipal(jwt)
                                .build();

                SecurityIdentity result = augmentor.augment(identity, context)
                                .await().indefinitely();

                assertTrue(result.hasRole("STUDENT"));
                assertEquals(1, result.getRoles().size());
        }
}