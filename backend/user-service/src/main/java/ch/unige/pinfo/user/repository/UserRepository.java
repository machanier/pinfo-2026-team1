package ch.unige.pinfo.user.repository;

import ch.unige.pinfo.user.model.User;
import java.util.UUID;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import ch.unige.pinfo.user.model.User;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, UUID> {

    public Optional<User> findByAuth0Id(String auth0Id) {
        return find("auth0Id", auth0Id).firstResultOptional();
    }
}