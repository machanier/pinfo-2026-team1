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

    private final JsonWebToken jwt;

    @Inject
    public UserResource(JsonWebToken jwt) {
        this.jwt = jwt;
    }

    @GET
    @RolesAllowed("Admin")
    @Produces(MediaType.APPLICATION_JSON)
    public List<User> getAll() {
        List<User> usersList = User.listAll();
        String currentSubject = jwt.getSubject();

        for (User u : usersList) {

            if (u.auth0Id.equals(currentSubject)) {
                u.setRole(getRoleFromJwt());
            }
        }
        return usersList;
    }

    private String getRoleFromJwt() {
        Object rolesClaim = jwt.getClaim("https://unigevents.com/roles");

        if (rolesClaim instanceof java.util.Collection<?> roles && !roles.isEmpty()) {
            Object firstRole = roles.iterator().next();
            return (firstRole != null) ? firstRole.toString().replace("\"", "") : "User";
        }

        return "User";
    }

    @GET
    @Path("/{auth0Id}")
    @RolesAllowed({ "Admin", "Student", "Organizer" })
    @Produces(MediaType.APPLICATION_JSON)
    public Response getByAuth0Id(@PathParam("auth0Id") String authId) {
        // 1. Appel statique explicite (C'est ce que Sonar veut)
        Optional<User> userOpt = User.find(User.AUTH0_ID_FIELD, authId).firstResultOptional();

        if (userOpt.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User user = userOpt.get();

        if (authId.equals(jwt.getSubject())) {
            user.setRole(getRoleFromJwt());
        }

        return Response.ok(user).build();
    }

    @POST
    @RolesAllowed({ "Admin", "Student", "Organizer" })
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response createUser(User userToCreate) {
        // Validation
        if (userToCreate.auth0Id == null || userToCreate.auth0Id.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"auth0Id is required\"}")
                    .build();
        }

        if (userToCreate.getEmail() == null || userToCreate.getEmail().isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"email is required\"}")
                    .build();
        }

        Optional<User> existingUser = User.find(User.AUTH0_ID_FIELD, userToCreate.auth0Id).firstResultOptional();

        if (existingUser.isPresent()) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("{\"error\": \"User with this auth0Id already exists\"}")
                    .build();
        }

        if (userToCreate.getRole() == null || userToCreate.getRole().isBlank()) {
            userToCreate.setRole("User");
        }

        userToCreate.persist();

        return Response.status(Response.Status.CREATED).entity(userToCreate).build();
    }

    @PUT
    @Path("/{auth0Id}")
    @RolesAllowed("Admin")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateUser(@PathParam("auth0Id") String authId, User updatedUser) {
        Optional<User> existingUser = User.find(User.AUTH0_ID_FIELD, authId).firstResultOptional();

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

        return Response.ok(user).build();
    }
}