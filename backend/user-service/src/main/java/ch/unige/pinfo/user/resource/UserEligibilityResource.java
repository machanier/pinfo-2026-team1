package ch.unige.pinfo.user.resource;

import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ch.unige.pinfo.user.service.EligibilityService;
import ch.unige.pinfo.user.dto.EligibilityAttributesDTO;

import java.util.UUID;

@Path("/internal/users")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@PermitAll
public class UserEligibilityResource {

    @Inject
    EligibilityService eligibilityService;

    @GET
    @Path("/{userId}/eligibility")
    public Response getEligibility(@PathParam("userId") String userId) {
        System.out.println("=== UserEligibilityResource ===");
        System.out.println("GET /internal/users/" + userId + "/eligibility");

        EligibilityAttributesDTO attributes = eligibilityService.getEligibilityAttributes(userId);

        if (attributes == null) {
            System.out.println("User not found: " + userId);
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\": \"User not found\"}")
                    .build();
        }

        System.out.println("Returning eligibility attributes:");
        System.out.println("  faculty: " + attributes.getFaculty());
        System.out.println("  major: " + attributes.getMajor());
        System.out.println("  degreeLevel: " + attributes.getDegreeLevel());

        return Response.ok(attributes).build();
    }
}