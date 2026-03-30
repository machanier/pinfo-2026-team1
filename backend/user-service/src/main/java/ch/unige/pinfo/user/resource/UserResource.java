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
                            u.setRole(firstRole.toString().replace("\"", ""));
                            System.out.println("DEBUG: Role injecté pour " + u.auth0Id + " -> " + u.getRole());
                        } else {
                            u.setRole("User");
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
                        u.setRole(firstRole.toString().replace("\"", ""));
                    }
                }
            }
        }

        return Response.ok(user.get()).build();
    }

    @POST
    @RolesAllowed({ "Admin", "Student", "Organizer" })
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

        if (user.getEmail() == null || user.getEmail().isBlank()) {
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
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("User");
        }

        // Persist the user
        user.persist();
        System.out.println("DEBUG: Utilisateur créé - " + user.auth0Id + " avec rôle: " + user.getRole());

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
        if (updatedUser.getEmail() != null)
            user.setEmail(updatedUser.getEmail());
        if (updatedUser.getName() != null)
            user.setName(updatedUser.getName());
        if (updatedUser.getPicture() != null)
            user.setPicture(updatedUser.getPicture());
        if (updatedUser.getRole() != null)
            user.setRole(updatedUser.getRole());

        user.persist();
        System.out.println("DEBUG: Utilisateur mis à jour - " + auth0Id);

        return Response.ok(user).build();
    }
}