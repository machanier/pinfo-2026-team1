package ch.unige.pinfo.user.auth0;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/oauth/token")
@RegisterRestClient(configKey = "auth0-token")
public interface Auth0TokenClient {

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    Auth0TokenResponse requestToken(Auth0TokenRequest request);
}
