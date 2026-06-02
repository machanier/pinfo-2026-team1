package ch.unige.pinfo.user.service;

import ch.unige.pinfo.user.model.DegreeLevel;
import ch.unige.pinfo.user.model.Student;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.messaging.UserEventPublisher;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import static jakarta.transaction.Transactional.TxType.REQUIRES_NEW;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import org.eclipse.microprofile.jwt.JsonWebToken;
import java.util.Optional;
import java.util.UUID;

import org.jboss.logging.Logger;

@ApplicationScoped
public class UserSyncService {

    private static final Logger LOG = Logger.getLogger(UserSyncService.class);

    // Auth0 strips standard OIDC profile claims (name/email/picture) from
    // access tokens by default — they only land in the id_token, which the
    // SPA keeps to itself and never sends to us. We therefore expose them
    // on the access token via namespaced custom claims set by the Auth0
    // post-login Action (see docs/AUTH0.md). The standard names below are
    // a fallback for tenants that do mirror them onto the access token, so
    // a misconfigured Action degrades gracefully rather than 500-ing on
    // the very first login.
    private static final String CLAIM_ROLES = "https://unigevents.com/roles";
    private static final String CLAIM_NAME = "https://unigevents.com/name";
    private static final String CLAIM_EMAIL = "https://unigevents.com/email";
    private static final String CLAIM_PICTURE = "https://unigevents.com/picture";

    private final UserRepository userRepository;
    private final JsonWebToken jwt;

    @Inject
    UserEventPublisher userEventPublisher;

    @Inject
    public UserSyncService(UserRepository userRepository, JsonWebToken jwt) {
        this.userRepository = userRepository;
        this.jwt = jwt;
    }

    @Transactional(REQUIRES_NEW)
    public void syncUser() {
        try {
            String auth0Id = jwt.getSubject();
            if (auth0Id == null)
                return;

            PanacheQuery<User> query = userRepository.find("auth0Id", auth0Id);
            Optional<User> existingUser = query == null ? Optional.empty() : query.firstResultOptional();

            // 1. On déclare la variable au niveau supérieur pour qu'elle soit visible
            // partout dans la méthode
            User userToPublish = null;

            if (existingUser.isEmpty()) {
                User user = new User();
                String role = getRoleFromJwt();
                if (isStudentRole(role)) {
                    Student student = new Student();
                    student.setFaculty("TO_BE_DEFINED");
                    student.setMajor("TO_BE_DEFINED");
                    student.setDegreeLevel(DegreeLevel.BACHELOR);
                    user = student;
                } else {
                    user = new User();
                }

                user.auth0Id = auth0Id;
                user.setId(UUID.nameUUIDFromBytes(auth0Id.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                user.name = firstNonNullClaim(CLAIM_NAME, "name");
                user.email = firstNonNullClaim(CLAIM_EMAIL, "email");
                user.avatarUrl = firstNonNullClaim(CLAIM_PICTURE, "picture");
                user.role = role;

                userRepository.persist(user);

                // On affecte notre variable de portée supérieure
                userToPublish = user;
            } else {
                // Ici, on n'utilise plus "User user = ...", on réutilise l'existant
                userToPublish = existingUser.get();
                userToPublish.role = getRoleFromJwt();

                // Si le nom ou l'avatar a changé dans Auth0 lors d'une reconnexion,
                // il est crucial de mettre à jour l'entité ici pour que le Search-Service
                // reçoive le nouveau nom !
                userToPublish.name = firstNonNullClaim(CLAIM_NAME, "name");
                userToPublish.avatarUrl = firstNonNullClaim(CLAIM_PICTURE, "picture");
            }

            // On force l'écriture en Base de Données
            userRepository.flush();

            // 2. Maintenant, la variable est accessible sans erreur de compilation
            // null-check sur userEventPublisher pour les profils de test où Kafka/Emitter n'est pas câblé.
            if (userToPublish != null && userEventPublisher != null
                    && "ORGANIZER".equalsIgnoreCase(userToPublish.role)) {
                userEventPublisher.publishOrganizerUpsert(userToPublish);
            }

        } catch (Exception e) {
            LOG.error("CRITICAL SYNC ERROR", e);
        }
    }

    // Méthode appelé par User/Student/associationResource
    public String getRoleFromJwt() {
        Object rolesClaim = jwt.getClaim(CLAIM_ROLES);
        if (rolesClaim instanceof java.util.Collection<?> roles && !roles.isEmpty()) {
            Object first = roles.iterator().next();
            return (first != null) ? first.toString().replace("\"", "") : "STUDENT";
        }
        return "STUDENT"; // Le rôle par défaut est le rôle étudiant
    }

    private String safeGetClaim(String claimName) {
        Object val = jwt.getClaim(claimName);
        if (val == null)
            return null;
        return String.valueOf(val).replace("\"", "");
    }

    // Try the namespaced claim first (set by our Auth0 Action), then the
    // standard OIDC name as a fallback.
    private String firstNonNullClaim(String namespacedName, String standardName) {
        String v = safeGetClaim(namespacedName);
        return v != null ? v : safeGetClaim(standardName);
    }

    private boolean isStudentRole(String role) {
        return role != null && "student".equalsIgnoreCase(role.trim());
    }

}