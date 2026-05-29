package ch.unige.pinfo.commons.cloudinary;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;

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
    private final String bannerUploadPreset;

    // Injected as Optional<String> so the service starts even when these values
    // are absent OR empty. SmallRye treats an empty config value (e.g. the
    // `${CLOUDINARY_API_SECRET:}` default when the env var is unset in prod) as
    // *missing*, and a required `String` @ConfigProperty then fails the entire
    // boot ("Failed to load config value ... cloudinary.api-key" → CrashLoop).
    // Optional turns that into an empty value instead; isConfigured() reports
    // false and the endpoint answers 503 until a real secret is provided.
    @Inject
    public CloudinarySignatureService(
            @ConfigProperty(name = "cloudinary.cloud-name") Optional<String> cloudName,
            @ConfigProperty(name = "cloudinary.api-key") Optional<String> apiKey,
            @ConfigProperty(name = "cloudinary.api-secret") Optional<String> apiSecret,
            @ConfigProperty(name = "cloudinary.upload-preset") Optional<String> uploadPreset,
            @ConfigProperty(name = "cloudinary.banner-upload-preset") Optional<String> bannerUploadPreset) {
        this.cloudName = cloudName.orElse("");
        this.apiKey = apiKey.orElse("");
        this.apiSecret = apiSecret.orElse("");
        this.uploadPreset = uploadPreset.orElse("");
        this.bannerUploadPreset = bannerUploadPreset.orElse("");
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

    /** @return whether the banner preset (and the shared credentials) are present. */
    public boolean isBannerConfigured() {
        return notBlank(cloudName) && notBlank(apiKey) && notBlank(apiSecret) && notBlank(bannerUploadPreset);
    }

    /**
     * Build a signature for the given authenticated subject's avatar. The asset
     * is pinned to a stable per-user {@code public_id} with {@code overwrite=true},
     * so even if a signature is replayed within its validity window it only
     * overwrites that user's own avatar instead of inflating storage.
     */
    public AvatarUploadSignature forSubject(String subject) {
        return build(uploadPreset, "avatars/" + sanitize(subject));
    }

    /**
     * Build a signature for an event-banner upload (PINFO-228). Banners are not
     * one-per-user (an organizer has many events), so the {@code public_id} is
     * unique per request; {@code overwrite=true} keeps a replayed signature
     * overwriting its own asset rather than spawning new ones.
     */
    public AvatarUploadSignature forBanner(String subject) {
        String publicId = "banners/" + sanitize(subject) + "/" + UUID.randomUUID().toString().substring(0, 8);
        return build(bannerUploadPreset, publicId);
    }

    private AvatarUploadSignature build(String preset, String publicId) {
        long timestamp = Instant.now().getEpochSecond();

        TreeMap<String, String> toSign = new TreeMap<>();
        toSign.put("overwrite", "true");
        toSign.put("public_id", publicId);
        toSign.put("timestamp", Long.toString(timestamp));
        toSign.put("upload_preset", preset);

        String signature = CloudinarySigner.sign(toSign, apiSecret);

        return new AvatarUploadSignature(cloudName, apiKey, timestamp, publicId, true, preset, signature);
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
