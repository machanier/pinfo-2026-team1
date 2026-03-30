package ch.unige.pinfo.user.service;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import java.util.Optional;
import java.util.Collection;

@ApplicationScoped
public class UserSyncService {

    private final UserRepository userRepository;
    private final JsonWebToken jwt;

    @Inject
    public UserSyncService(UserRepository userRepository, JsonWebToken jwt) {
        this.userRepository = userRepository;
        this.jwt = jwt;
    }

    @Transactional
    public void syncUser() {
        try {
            String auth0Id = jwt.getSubject();
            if (auth0Id == null)
                return;

            Optional<User> existingUser = userRepository.find("auth0Id", auth0Id).firstResultOptional();

            User user;
            if (existingUser.isEmpty()) {
                user = new User();
                user.auth0Id = auth0Id;

                user.setEmail(safeGetClaim("email"));
                user.setName(safeGetClaim("name"));
                user.setPicture(safeGetClaim("picture"));
                userRepository.persist(user);
            } else {
                user = existingUser.get();
            }

            // Gestion des rôles
            Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");
            if (rolesClaim instanceof Collection<?>) {
                Collection<?> roles = (Collection<?>) rolesClaim;
                if (!roles.isEmpty()) {
                    user.role = roles.iterator().next().toString().replace("\"", "");
                }
            }

            userRepository.flush(); // On force l'écriture pour intercepter l'erreur ici

        } catch (Exception e) {
            System.err.println("CRITICAL SYNC ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String safeGetClaim(String claimName) {
        Object val = jwt.getClaim(claimName);
        if (val == null)
            return null;
        // On force la conversion en String pure pour éviter le bug [C (ClassCast)
        return String.valueOf(val).replace("\"", "");
    }
}