package ch.unige.pinfo.user.security;

import io.quarkus.security.identity.AuthenticationRequestContext;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.SecurityIdentityAugmentor;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.jwt.JsonWebToken;
import java.util.HashSet;
import java.util.Set;

@ApplicationScoped
public class CustomSecurityAugmentor implements SecurityIdentityAugmentor {

    @Override
    public Uni<SecurityIdentity> augment(SecurityIdentity identity, AuthenticationRequestContext context) {
        // Si l'utilisateur n'est pas authentifié (pas de JWT), on ne fait rien
        if (identity.isAnonymous()) {
            return Uni.createFrom().item(identity);
        }

        return Uni.createFrom().item(() -> {
            JsonWebToken jwt = (JsonWebToken) identity.getPrincipal();
            Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");

            Set<String> quarkusRoles = new HashSet<>();

            if (rolesClaim instanceof java.util.Collection<?> roles) {
                for (Object role : roles) {
                    if (role != null) {
                        quarkusRoles.add(role.toString().replace("\"", "").toUpperCase());
                    }
                }
            } else if (rolesClaim instanceof String s && !s.isBlank()) {
                quarkusRoles.add(s.replace("\"", "").toUpperCase());
            }

            if (quarkusRoles.isEmpty()) {
                return identity;
            }

            return QuarkusSecurityIdentity.builder(identity)
                    .addRoles(quarkusRoles)
                    .build();
        });
    }
}