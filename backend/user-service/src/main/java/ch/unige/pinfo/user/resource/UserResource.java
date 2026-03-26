package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.User;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users")
@Authenticated
public class UserResource {

    @Inject
    JsonWebToken jwt;

    @GET
    @RolesAllowed("Admin")
    @Produces(MediaType.APPLICATION_JSON)
    public List<User> getAll() {
        List<User> users = User.listAll();

        for (User u : users) {
            if (u.auth0Id.equals(jwt.getSubject())) {
                Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");

                if (rolesClaim instanceof java.util.Collection<?>) {
                    java.util.Collection<?> roles = (java.util.Collection<?>) rolesClaim;

                    if (!roles.isEmpty()) {

                        Object firstRole = roles.iterator().next();

                        if (firstRole != null) {
                            u.role = firstRole.toString();
                            System.out.println("DEBUG: Role injecté pour " + u.auth0Id + " -> " + u.role);
                        } else {
                            u.role = "User";
                        }
                    }
                }
            }
        }
        return users;
    }
}