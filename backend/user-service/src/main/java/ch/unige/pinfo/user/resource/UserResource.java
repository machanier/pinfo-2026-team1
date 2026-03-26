package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.model.User;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Optional;

import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/api/users")
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
                            u.role = firstRole.toString().replace("\"", "");
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

    @GET
    @Path("/{auth0Id}")
    @RolesAllowed({ "Admin", "Student", "Organizer" })
    @Produces(MediaType.APPLICATION_JSON)
    public Response getByAuth0Id(@PathParam("auth0Id") String auth0Id) {
        Optional<User> user = User.find("auth0Id", auth0Id).firstResultOptional();

        if (user.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // Inject role if user is viewing their own profile
        if (auth0Id.equals(jwt.getSubject())) {
            User u = user.get();
            Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");

            if (rolesClaim instanceof java.util.Collection<?>) {
                java.util.Collection<?> roles = (java.util.Collection<?>) rolesClaim;
                if (!roles.isEmpty()) {
                    Object firstRole = roles.iterator().next();
                    if (firstRole != null) {
                        u.role = firstRole.toString().replace("\"", "");
                    }
                }
            }
        }

        return Response.ok(user.get()).build();
    }

    @POST
    @RolesAllowed("Admin")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response createUser(User user) {
        // Validation
        if (user.auth0Id == null || user.auth0Id.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"auth0Id is required\"}")
                    .build();
        }

        if (user.email == null || user.email.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"email is required\"}")
                    .build();
        }

        // Check if user already exists
        Optional<User> existingUser = User.find("auth0Id", user.auth0Id).firstResultOptional();
        if (existingUser.isPresent()) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("{\"error\": \"User with this auth0Id already exists\"}")
                    .build();
        }

        // Set default role if not provided
        if (user.role == null || user.role.isBlank()) {
            user.role = "User";
        }

        // Persist the user
        user.persist();
        System.out.println("DEBUG: Utilisateur créé - " + user.auth0Id + " avec rôle: " + user.role);

        return Response.status(Response.Status.CREATED).entity(user).build();
    }

    @PUT
    @Path("/{auth0Id}")
    @RolesAllowed("Admin")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateUser(@PathParam("auth0Id") String auth0Id, User updatedUser) {
        Optional<User> existingUser = User.find("auth0Id", auth0Id).firstResultOptional();

        if (existingUser.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\": \"User not found\"}")
                    .build();
        }

        User user = existingUser.get();
        if (updatedUser.email != null)
            user.email = updatedUser.email;
        if (updatedUser.name != null)
            user.name = updatedUser.name;
        if (updatedUser.picture != null)
            user.picture = updatedUser.picture;
        if (updatedUser.role != null)
            user.role = updatedUser.role;

        user.persist();
        System.out.println("DEBUG: Utilisateur mis à jour - " + auth0Id);

        return Response.ok(user).build();
    }
}