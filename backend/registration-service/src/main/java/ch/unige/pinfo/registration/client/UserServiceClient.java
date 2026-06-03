package ch.unige.pinfo.registration.client;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.eclipse.microprofile.rest.client.annotation.RegisterProvider;

import ch.unige.pinfo.registration.dto.EligibilityAttributesDTO;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import java.util.UUID;

@RegisterRestClient(configKey = "user-service")
@RegisterProvider(InternalServiceKeyFilter.class)
@Path("/internal")
public interface UserServiceClient {

    @GET
    @Path("/users/{userId}/eligibility")
    EligibilityAttributesDTO checkEligibility(
            @PathParam("userId") UUID userId);
}