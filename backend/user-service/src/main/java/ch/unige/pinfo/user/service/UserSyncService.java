package ch.unige.pinfo.user.service;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Optional;

@ApplicationScoped
public class UserSyncService {

    @Inject
    UserRepository userRepository;

    @Inject
    JsonWebToken jwt;

    @Transactional
    public void syncUser() {
        // 1. Extraire l'ID unique Auth0 (claim "sub")
        String auth0Id = jwt.getSubject();

        if (auth0Id == null)
            return;

        // 2. Vérifier si l'utilisateur existe déjà
        Optional<User> existingUser = userRepository.find("auth0Id", auth0Id).firstResultOptional();

        // 3. Si absent, on le crée avec les infos du token
        if (existingUser.isEmpty()) {
            User newUser = new User();
            newUser.auth0Id = auth0Id;
            // On récupère l'email et le nom via les claims standards du JWT
            newUser.email = jwt.getClaim("email");
            newUser.name = jwt.getClaim("name");
            newUser.picture = jwt.getClaim("picture");

            userRepository.persist(newUser);
        }
    }
}
