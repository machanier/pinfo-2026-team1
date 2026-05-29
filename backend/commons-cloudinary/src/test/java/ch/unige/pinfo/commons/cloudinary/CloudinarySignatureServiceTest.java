package ch.unige.pinfo.commons.cloudinary;

import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CloudinarySignatureServiceTest {

    private static CloudinarySignatureService service(String cloud, String key, String secret,
                                                      String preset, String bannerPreset) {
        return new CloudinarySignatureService(
                Optional.ofNullable(cloud), Optional.ofNullable(key), Optional.ofNullable(secret),
                Optional.ofNullable(preset), Optional.ofNullable(bannerPreset));
    }

    private static CloudinarySignatureService configured() {
        return service("democloud", "123456789", "topsecret", "unigevents_profil", "unigevents_banner");
    }

    @Test
    void isConfigured_trueWhenAllAvatarCredentialsPresent() {
        assertTrue(configured().isConfigured());
    }

    @Test
    void isConfigured_falseWhenAnyRequiredFieldIsBlankOrMissing() {
        assertFalse(service("democloud", "key", "", "preset", "banner").isConfigured());   // empty secret
        assertFalse(service(null, "key", "secret", "preset", "banner").isConfigured());     // missing cloud
        assertFalse(service("democloud", "key", "secret", "  ", "banner").isConfigured());  // blank preset
    }

    @Test
    void isBannerConfigured_requiresTheBannerPresetOnTopOfTheSharedCredentials() {
        assertTrue(configured().isBannerConfigured());
        assertFalse(service("democloud", "key", "secret", "preset", "").isBannerConfigured());
    }

    @Test
    void forSubject_pinsAStableAvatarPublicIdAndSignsTheEchoedParams() {
        CloudinarySignatureService service = configured();

        AvatarUploadSignature sig = service.forSubject("auth0|abc123");

        assertEquals("democloud", sig.cloudName());
        assertEquals("123456789", sig.apiKey());
        assertEquals("avatars/auth0_abc123", sig.publicId());
        assertTrue(sig.overwrite());
        assertEquals("unigevents_profil", sig.uploadPreset());

        // The signature must equal the documented Cloudinary contract computed
        // over the exact params the browser echoes back to the upload API.
        TreeMap<String, String> toSign = new TreeMap<>();
        toSign.put("overwrite", "true");
        toSign.put("public_id", sig.publicId());
        toSign.put("timestamp", Long.toString(sig.timestamp()));
        toSign.put("upload_preset", "unigevents_profil");
        assertEquals(CloudinarySigner.sign(toSign, "topsecret"), sig.signature());
    }

    @Test
    void forBanner_usesAUniquePublicIdUnderTheBannerFolderAndBannerPreset() {
        AvatarUploadSignature sig = configured().forBanner("google-oauth2|999");

        assertTrue(sig.publicId().startsWith("banners/google-oauth2_999/"));
        assertEquals("unigevents_banner", sig.uploadPreset());
        assertTrue(sig.overwrite());
        assertNotNull(sig.signature());
    }

    @Test
    void forBanner_isUniquePerCall() {
        CloudinarySignatureService service = configured();
        assertNotEquals(service.forBanner("auth0|x").publicId(),
                service.forBanner("auth0|x").publicId());
    }

    @Test
    void sanitize_replacesEveryCharacterOutsideTheAllowedSet() {
        assertEquals("auth0_abc", CloudinarySignatureService.sanitize("auth0|abc"));
        assertEquals("google-oauth2_123", CloudinarySignatureService.sanitize("google-oauth2|123"));
        assertEquals("a_b_c", CloudinarySignatureService.sanitize("a/b c"));
    }
}
