package ch.unige.pinfo.moderation.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.ClientHeaderParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenAiModerationModelsTest {

    @Test
    void request_setsSingleInputValue() {
        OpenAiModerationRequest request = new OpenAiModerationRequest("hello");

        assertEquals(List.of("hello"), request.input);
    }

    @Test
    void response_deserializesCategoryFields() throws Exception {
        String json = "{"
                + "\"results\":[{"
                + "\"flagged\":true,"
                + "\"categories\":{"
                + "\"hate\":true,"
                + "\"harassment\":false,"
                + "\"violence\":true,"
                + "\"self-harm\":true,"
                + "\"sexual/minors\":false"
                + "},"
                + "\"category_scores\":{"
                + "\"hate\":0.8,"
                + "\"harassment\":0.1,"
                + "\"violence\":0.9,"
                + "\"self-harm\":0.7,"
                + "\"sexual/minors\":0.2"
                + "}"
                + "}]}";

        ObjectMapper mapper = new ObjectMapper();
        OpenAiModerationResponse response = mapper.readValue(json, OpenAiModerationResponse.class);

        assertNotNull(response.results);
        assertEquals(1, response.results.size());
        OpenAiModerationResponse.ModerationResult result = response.results.get(0);
        assertTrue(result.flagged);
        assertTrue(result.categories.hate);
        assertTrue(result.categories.violence);
        assertTrue(result.categories.selfHarm);
        assertEquals(0.8f, result.categoryScores.hate);
        assertEquals(0.2f, result.categoryScores.sexualMinors);
    }

    @Test
    void response_serializesSpecialCategoryFields() throws Exception {
        OpenAiModerationResponse response = new OpenAiModerationResponse();
        OpenAiModerationResponse.ModerationResult result = new OpenAiModerationResponse.ModerationResult();
        result.flagged = true;
        result.categories = new OpenAiModerationResponse.Categories();
        result.categories.selfHarm = true;
        result.categories.sexualMinors = true;
        result.categoryScores = new OpenAiModerationResponse.CategoryScores();
        result.categoryScores.selfHarm = 0.6f;
        result.categoryScores.sexualMinors = 0.3f;
        response.results = List.of(result);

        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(response);

        assertTrue(json.contains("\"self-harm\""));
        assertTrue(json.contains("\"sexual/minors\""));
    }

    @Test
    void client_annotations_matchOpenAiContract() throws Exception {
        Path path = OpenAiModerationClient.class.getAnnotation(Path.class);
        RegisterRestClient restClient = OpenAiModerationClient.class.getAnnotation(RegisterRestClient.class);
        ClientHeaderParam headerParam = OpenAiModerationClient.class.getAnnotation(ClientHeaderParam.class);

        assertNotNull(path);
        assertEquals("/v1", path.value());
        assertNotNull(restClient);
        assertEquals("openai-moderation", restClient.configKey());
        assertNotNull(headerParam);
        assertEquals("Authorization", headerParam.name());
        assertEquals("Bearer ${openai.api.key}", headerParam.value());

        var method = OpenAiModerationClient.class.getMethod("moderate", OpenAiModerationRequest.class);
        assertNotNull(method.getAnnotation(POST.class));
        Path methodPath = method.getAnnotation(Path.class);
        assertNotNull(methodPath);
        assertEquals("/moderations", methodPath.value());

        Consumes consumes = method.getAnnotation(Consumes.class);
        Produces produces = method.getAnnotation(Produces.class);
        assertNotNull(consumes);
        assertNotNull(produces);
        assertEquals(MediaType.APPLICATION_JSON, consumes.value()[0]);
        assertEquals(MediaType.APPLICATION_JSON, produces.value()[0]);
    }
}
