package ch.unige.pinfo.registration.client;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import ch.unige.pinfo.registration.dto.EligibilityAttributesDTO;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

@RegisterRestClient(configKey = "user-service")
@Path("/internal")
public interface UserServiceClient {

    @GET
    @Path("/users/{userId}/eligibility")
    EligibilityAttributesDTO checkEligibility(
            @PathParam("userId") String userId);
}