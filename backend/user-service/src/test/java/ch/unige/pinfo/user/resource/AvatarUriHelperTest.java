package ch.unige.pinfo.user.resource;

import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AvatarUriHelperTest {

    @Test
    void safeAvatarUri_returnsNullForBlank() {
        assertNull(AvatarUriHelper.safeAvatarUri(null));
        assertNull(AvatarUriHelper.safeAvatarUri(""));
        assertNull(AvatarUriHelper.safeAvatarUri("  "));
    }

    @Test
    void safeAvatarUri_returnsNullForInvalidUri() {
        assertNull(AvatarUriHelper.safeAvatarUri("http://[invalid"));
    }

    @Test
    void safeAvatarUri_allowsReasonableUri() {
        URI uri = AvatarUriHelper.safeAvatarUri("https://example.com/avatar.png");
        assertEquals("https://example.com/avatar.png", uri.toString());
    }

    @Test
    void safeAvatarUri_blocksOversizedDataUrl() {
        String dataUrl = "data:image/png;base64," + "a".repeat(33000);
        assertNull(AvatarUriHelper.safeAvatarUri(dataUrl));
    }
}
