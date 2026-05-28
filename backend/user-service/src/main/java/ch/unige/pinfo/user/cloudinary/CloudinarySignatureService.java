package ch.unige.pinfo.user.cloudinary;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;
import java.util.TreeMap;

/**
 * Builds signed Cloudinary avatar-upload payloads.
 *
 * <p>The API secret is injected here and never leaves the server; the browser
 * only ever receives a short-lived signature. This is what lets the Cloudinary
 * upload preset be flipped to "signed": once signed, an upload with no valid
 * signature is refused by Cloudinary, so the old "anyone who read the cloud name
 * and preset from the JS bundle can POST uploads" abuse path is closed.
 */
@ApplicationScoped
public class CloudinarySignatureService {

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final String uploadPreset;

    @Inject
    public CloudinarySignatureService(
            @ConfigProperty(name = "cloudinary.cloud-name") String cloudName,
            @ConfigProperty(name = "cloudinary.api-key") String apiKey,
            @ConfigProperty(name = "cloudinary.api-secret") String apiSecret,
            @ConfigProperty(name = "cloudinary.upload-preset") String uploadPreset) {
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.uploadPreset = uploadPreset;
    }

    /**
     * @return whether all required Cloudinary settings are present. Missing
     *         settings (e.g. an unset Doppler secret) mean we cannot mint a
     *         signature; the resource turns this into a 503 rather than handing
     *         the browser a broken upload.
     */
    public boolean isConfigured() {
        return notBlank(cloudName) && notBlank(apiKey) && notBlank(apiSecret) && notBlank(uploadPreset);
    }

    /**
     * Build a signature for the given authenticated subject. The asset is pinned
     * to a stable per-user {@code public_id} with {@code overwrite=true}, so even
     * if a signature is replayed within its validity window it only overwrites
     * that user's own avatar instead of inflating storage with fresh assets.
     */
    public AvatarUploadSignature forSubject(String subject) {
        long timestamp = Instant.now().getEpochSecond();
        String publicId = "avatars/" + sanitize(subject);

        TreeMap<String, String> toSign = new TreeMap<>();
        toSign.put("overwrite", "true");
        toSign.put("public_id", publicId);
        toSign.put("timestamp", Long.toString(timestamp));
        toSign.put("upload_preset", uploadPreset);

        String signature = CloudinarySigner.sign(toSign, apiSecret);

        return new AvatarUploadSignature(cloudName, apiKey, timestamp, publicId, true, uploadPreset, signature);
    }

    // Auth0 subjects look like "auth0|abc" or "google-oauth2|123". Collapse any
    // character outside [A-Za-z0-9_-] to '_' so the public_id is stable, safe in
    // a URL, and exactly one per user (no path-traversal via '/', no escaping).
    static String sanitize(String subject) {
        return subject.replaceAll("[^A-Za-z0-9_-]", "_");
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
