package ch.unige.pinfo.user.resource;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AvatarUriHelperTest {

    private static String dataUriBase64(String mime, String body) {
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(body.getBytes());
    }

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
        String uri = AvatarUriHelper.safeAvatarUri("https://example.com/avatar.png");
        assertEquals("https://example.com/avatar.png", uri);
    }

    @Test
    void safeAvatarUri_blocksOversizedDataUrl() {
        String dataUrl = "data:image/png;base64," + "a".repeat(33000);
        assertNull(AvatarUriHelper.safeAvatarUri(dataUrl));
    }

    // ── PINFO-216: data URI MIME validation ──────────────────────────────

    @Test
    void safeAvatarUri_acceptsPngBase64() {
        String uri = dataUriBase64("image/png", "fake-png-bytes");
        assertEquals(uri, AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_acceptsJpegBase64() {
        String uri = dataUriBase64("image/jpeg", "fake-jpeg-bytes");
        assertEquals(uri, AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_acceptsJpgBase64() {
        String uri = dataUriBase64("image/jpg", "fake-jpg-bytes");
        assertEquals(uri, AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_acceptsWebpBase64() {
        String uri = dataUriBase64("image/webp", "fake-webp-bytes");
        assertEquals(uri, AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_acceptsGifBase64() {
        String uri = dataUriBase64("image/gif", "fake-gif-bytes");
        assertEquals(uri, AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_isMimeCaseInsensitive() {
        String uri = "data:IMAGE/PNG;base64," + Base64.getEncoder().encodeToString("x".getBytes());
        assertEquals(uri, AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_blocksSvgDataUri() {
        // Real-world stored-XSS payload: SVG with onload="alert(...)"
        String maliciousSvg = "<svg onload=\"alert('xss')\"></svg>";
        String uri = dataUriBase64("image/svg+xml", maliciousSvg);
        assertNull(AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_blocksHtmlDataUri() {
        String uri = dataUriBase64("text/html", "<script>alert(1)</script>");
        assertNull(AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_blocksJavaScriptDataUri() {
        String uri = dataUriBase64("application/javascript", "alert(1)");
        assertNull(AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_blocksDataUriWithoutBase64Encoding() {
        // Non-base64 data URI (e.g. URL-encoded SVG) — still risky, refuse.
        String uri = "data:image/png,not-base64";
        assertNull(AvatarUriHelper.safeAvatarUri(uri));
    }

    @Test
    void safeAvatarUri_blocksDataUriWithBogusMimeType() {
        String uri = dataUriBase64("image/exe", "abc");
        assertNull(AvatarUriHelper.safeAvatarUri(uri));
    }
}
