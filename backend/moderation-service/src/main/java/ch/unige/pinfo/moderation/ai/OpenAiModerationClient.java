package ch.unige.pinfo.moderation.ai;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.eclipse.microprofile.rest.client.annotation.ClientHeaderParam;

@Path("/v1")
@RegisterRestClient(configKey = "openai-moderation")
@ClientHeaderParam(name = "Authorization", value = "Bearer ${openai.api.key}")
public interface OpenAiModerationClient {

    @POST
    @Path("/moderations")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    OpenAiModerationResponse moderate(OpenAiModerationRequest request);
}