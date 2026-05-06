package ch.unige.pinfo.event.security;

import io.quarkus.security.identity.AuthenticationRequestContext;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.SecurityIdentityAugmentor;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * Reads the namespaced Auth0 roles claim ("https://unigevents.com/roles") and
 * adds the values to the Quarkus SecurityIdentity so that @RolesAllowed works.
 *
 * Background: smallrye.jwt.path.groups cannot be set to this claim name because
 * SmallRye interprets the value as a JSON Pointer, splitting on '/', and never
 * finds the claim. This augmentor reads the claim directly instead.
 */
@ApplicationScoped
public class JwtRolesAugmentor implements SecurityIdentityAugmentor {

    private static final String ROLES_CLAIM = "https://unigevents.com/roles";

    @Override
    public Uni<SecurityIdentity> augment(SecurityIdentity identity, AuthenticationRequestContext context) {
        if (identity.isAnonymous()) {
            return Uni.createFrom().item(identity);
        }

        return Uni.createFrom().item(() -> {
            JsonWebToken jwt = (JsonWebToken) identity.getPrincipal();
            Object rolesClaim = jwt.getClaim(ROLES_CLAIM);

            Set<String> roles = new HashSet<>();
            if (rolesClaim instanceof Collection<?> collection) {
                for (Object r : collection) {
                    if (r != null) {
                        roles.add(r.toString().replace("\"", "").toUpperCase());
                    }
                }
            } else if (rolesClaim instanceof String s && !s.isBlank()) {
                roles.add(s.replace("\"", "").toUpperCase());
            }

            if (roles.isEmpty()) {
                return identity;
            }

            return QuarkusSecurityIdentity.builder(identity)
                    .addRoles(roles)
                    .build();
        });
    }
}
