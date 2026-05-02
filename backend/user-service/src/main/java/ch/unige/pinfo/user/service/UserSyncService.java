package ch.unige.pinfo.user.service;

import ch.unige.pinfo.user.model.DegreeLevel;
import ch.unige.pinfo.user.model.Student;
import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import org.eclipse.microprofile.jwt.JsonWebToken;
import java.util.Optional;
import org.jboss.logging.Logger;

@ApplicationScoped
public class UserSyncService {

    private static final Logger LOG = Logger.getLogger(UserSyncService.class);

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

            PanacheQuery<User> query = userRepository.find("auth0Id", auth0Id);
            Optional<User> existingUser = query == null ? Optional.empty() : query.firstResultOptional();

            if (existingUser.isEmpty()) {
                User user = new User();
                String role = getRoleFromJwt();
                if (isStudentRole(role)) {
                    Student student = new Student();
                    // Required defaults for JIT provisioning of student subtype.
                    student.setFaculty("TO_BE_DEFINED");
                    student.setMajor("TO_BE_DEFINED");
                    student.setDegreeLevel(DegreeLevel.BACHELOR);
                    user = student;
                } else {
                    user = new User();
                }

                user.auth0Id = auth0Id;
                user.name = safeGetClaim("name");
                user.email = safeGetClaim("email");
                user.avatarUrl = safeGetClaim("picture");
                user.role = role;
                // Le champ 'active' a une valeur par défaut et 'createdAt' est généré par
                // prePersist()
                userRepository.persist(user);
            } else {
                // user exists — only update role in case it changed in Auth0
                User user = existingUser.get();
                user.role = getRoleFromJwt();
            }

            userRepository.flush();

        } catch (Exception e) {
            LOG.error("CRITICAL SYNC ERROR", e);
        }
    }

    // Méthode appelé par User/Student/associationResource
    public String getRoleFromJwt() {
        Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");
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

    private boolean isStudentRole(String role) {
        return role != null && "student".equalsIgnoreCase(role.trim());
    }

}