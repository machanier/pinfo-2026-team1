package ch.unige.pinfo.moderation.ai;

import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OpenAiModerationHeadersFactoryTest {

    @Test
    void update_throwsWhenApiKeyIsNull() throws Exception {
        OpenAiModerationHeadersFactory factory = new OpenAiModerationHeadersFactory();
        setApiKey(factory, null);

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> factory.update(new MultivaluedHashMap<>(), new MultivaluedHashMap<>()));

        assertEquals("openai.api.key is not configured", exception.getMessage());
    }

    @Test
    void update_throwsWhenApiKeyIsBlank() throws Exception {
        OpenAiModerationHeadersFactory factory = new OpenAiModerationHeadersFactory();
        setApiKey(factory, "   ");

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> factory.update(new MultivaluedHashMap<>(), new MultivaluedHashMap<>()));

        assertEquals("openai.api.key is not configured", exception.getMessage());
    }

    @Test
    void update_setsAuthorizationHeaderWhenApiKeyPresent() throws Exception {
        OpenAiModerationHeadersFactory factory = new OpenAiModerationHeadersFactory();
        setApiKey(factory, "test-key");

        MultivaluedMap<String, String> outgoing = new MultivaluedHashMap<>();
        MultivaluedMap<String, String> returned = factory.update(new MultivaluedHashMap<>(), outgoing);

        assertSame(outgoing, returned);
        assertEquals("Bearer test-key", outgoing.getFirst("Authorization"));
    }

    private static void setApiKey(OpenAiModerationHeadersFactory factory, String value) throws Exception {
        Field field = OpenAiModerationHeadersFactory.class.getDeclaredField("openAiApiKey");
        field.setAccessible(true);
        field.set(factory, value);
    }
}
