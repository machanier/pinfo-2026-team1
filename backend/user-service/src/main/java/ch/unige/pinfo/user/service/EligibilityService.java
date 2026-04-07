package ch.unige.pinfo.user.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import ch.unige.pinfo.user.repository.UserRepository;
import ch.unige.pinfo.user.dto.EligibilityAttributesDTO;
import ch.unige.pinfo.user.model.User;

import java.util.UUID;
import java.util.Optional;

@ApplicationScoped
public class EligibilityService {

    @Inject
    UserRepository userRepository;

    public EligibilityAttributesDTO getEligibilityAttributes(String userId) {
        // On cherche par auth0_id au lieu de l'ID UUID technique
        Optional<User> user;

        if (userId.startsWith("auth0|")) {
            user = userRepository.find("auth0Id", userId).firstResultOptional();
        } else {
            try {
                user = userRepository.findByIdOptional(UUID.fromString(userId));
            } catch (IllegalArgumentException e) {
                user = Optional.empty();
            }
        }

        if (user.isEmpty()) {
            return null;
        }

        User u = user.get();
        return new EligibilityAttributesDTO(
                u.getId(),
                u.getFaculty(),
                u.getMajor(),
                u.getDegreeLevel() != null ? u.getDegreeLevel().toString() : null);
    }
}