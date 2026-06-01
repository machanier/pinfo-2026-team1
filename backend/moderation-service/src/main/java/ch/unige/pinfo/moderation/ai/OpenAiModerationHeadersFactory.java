package ch.unige.pinfo.moderation.ai;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.ext.ClientHeadersFactory;
import jakarta.ws.rs.core.MultivaluedMap;

/**
 * Supplies the OpenAI bearer token for the moderation REST client.
 *
 * Quarkus calls this factory for every request so the Authorization header is
 * built from the runtime-configured {@code openai.api.key} value instead of a
 * hardcoded secret.
 * This helper class runs before the OpenAI API call. Quarkus asks this class to
 * build the outgoing HTTP headers, and it adds: `Authorization: Bearer <openai key>`.
 * It reads the key from openai.api.key. If the key is missing, it throws immediately
 * instead of sending a bad request.
 */
@ApplicationScoped
public class OpenAiModerationHeadersFactory implements ClientHeadersFactory {

    @ConfigProperty(name = "openai.api.key")
    String openAiApiKey;

    @Override
    public MultivaluedMap<String, String> update(MultivaluedMap<String, String> incomingHeaders,
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            throw new IllegalStateException("openai.api.key is not configured");
        }

        clientOutgoingHeaders.putSingle("Authorization", "Bearer " + openAiApiKey);
        return clientOutgoingHeaders;
    }
}