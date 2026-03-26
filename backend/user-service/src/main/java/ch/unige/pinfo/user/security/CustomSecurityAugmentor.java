package ch.unige.pinfo.user.security;

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

@ApplicationScoped
public class CustomSecurityAugmentor implements SecurityIdentityAugmentor {

    @Override
    public Uni<SecurityIdentity> augment(SecurityIdentity identity, AuthenticationRequestContext context) {
        // Si l'utilisateur n'est pas authentifié (pas de JWT), on ne fait rien
        if (identity.isAnonymous()) {
            return Uni.createFrom().item(identity);
        }

        return Uni.createFrom().item(() -> {
            // On récupère le JWT à partir de l'identité actuelle
            JsonWebToken jwt = (JsonWebToken) identity.getPrincipal();

            // On extrait manuellement ton claim Auth0
            Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");

            if (rolesClaim instanceof Collection<?>) {
                Collection<?> roles = (Collection<?>) rolesClaim;
                Set<String> quarkusRoles = new HashSet<>();

                for (Object role : roles) {
                    if (role != null) {
                        // On ajoute le rôle (ex: "Admin") à l'identité Quarkus
                        quarkusRoles.add(role.toString().replace("\"", ""));
                    }
                }

                // On renvoie une nouvelle identité augmentée avec les rôles
                return QuarkusSecurityIdentity.builder(identity)
                        .addRoles(quarkusRoles)
                        .build();
            }

            return identity;
        });
    }
}