package ch.unige.pinfo.event.security;

import io.quarkus.security.identity.AuthenticationRequestContext;
import io.quarkus.security.identity.SecurityIdentity;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtRolesAugmentorTest {

    private static final String ROLES_CLAIM = "https://unigevents.com/roles";

    private final JwtRolesAugmentor augmentor = new JwtRolesAugmentor();
    private final AuthenticationRequestContext ctx = mock(AuthenticationRequestContext.class);

    private SecurityIdentity mockIdentity(boolean isAnonymous, Object rolesClaim) {
        SecurityIdentity identity = mock(SecurityIdentity.class);
        when(identity.isAnonymous()).thenReturn(isAnonymous);
        when(identity.getRoles()).thenReturn(Set.of());
        when(identity.getAttributes()).thenReturn(Map.of());
        when(identity.getCredentials()).thenReturn(Set.of());

        if (!isAnonymous) {
            JsonWebToken jwt = mock(JsonWebToken.class);
            when(jwt.getClaim(ROLES_CLAIM)).thenReturn(rolesClaim);
            doReturn(jwt).when(identity).getPrincipal();
        }
        return identity;
    }

    // ── isAnonymous() true branch ──────────────────────────────────────────

    @Test
    void anonymousIdentity_returnsUnchanged() {
        SecurityIdentity identity = mockIdentity(true, null);
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertSame(identity, result);
    }

    // ── Collection claim branches ──────────────────────────────────────────

    @Test
    void collectionClaim_nonNull_addsRoles() {
        SecurityIdentity identity = mockIdentity(false, List.of("ORGANIZER", "STUDENT"));
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertTrue(result.hasRole("ORGANIZER"));
        assertTrue(result.hasRole("STUDENT"));
    }

    @Test
    void collectionClaim_withNullItem_skipsNull() {
        List<Object> claimWithNull = new ArrayList<>();
        claimWithNull.add("ORGANIZER");
        claimWithNull.add(null);
        SecurityIdentity identity = mockIdentity(false, claimWithNull);
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertTrue(result.hasRole("ORGANIZER"));
    }

    @Test
    void collectionClaim_empty_returnsUnchanged() {
        SecurityIdentity identity = mockIdentity(false, List.of());
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertSame(identity, result);
    }

    @Test
    void collectionClaim_stripsEmbeddedQuotes() {
        SecurityIdentity identity = mockIdentity(false, List.of("\"ADMIN\""));
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertTrue(result.hasRole("ADMIN"));
    }

    // ── String claim branches ──────────────────────────────────────────────

    @Test
    void stringClaim_nonBlank_addsRole() {
        SecurityIdentity identity = mockIdentity(false, "ADMIN");
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertTrue(result.hasRole("ADMIN"));
    }

    @Test
    void stringClaim_nonBlank_stripsQuotes() {
        SecurityIdentity identity = mockIdentity(false, "\"ORGANIZER\"");
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertTrue(result.hasRole("ORGANIZER"));
    }

    @Test
    void stringClaim_blank_returnsUnchanged() {
        SecurityIdentity identity = mockIdentity(false, "   ");
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertSame(identity, result);
    }

    // ── null / unknown claim ───────────────────────────────────────────────

    @Test
    void nullClaim_returnsUnchanged() {
        SecurityIdentity identity = mockIdentity(false, null);
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertSame(identity, result);
    }

    @Test
    void unknownClaimType_returnsUnchanged() {
        // e.g. claim is an Integer – matches neither Collection nor String
        SecurityIdentity identity = mockIdentity(false, 42);
        SecurityIdentity result = augmentor.augment(identity, ctx).await().indefinitely();
        assertSame(identity, result);
    }
}
