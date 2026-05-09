package ch.unige.pinfo.user.resource;

import java.util.regex.Pattern;

final class AvatarUriHelper {

    private static final int MAX_AVATAR_URI_LENGTH = 32768;

    // PINFO-216: only accept raster image MIME types in data: URIs.
    // SVG (data:image/svg+xml;...) is deliberately excluded — SVG markup
    // can carry <script> tags and on* attributes that execute as JS the
    // moment the avatar is rendered in an <img> with `srcdoc` semantics
    // or, worse, in an <object>/<iframe>. Restricting to PNG/JPEG/WebP/
    // GIF removes that XSS surface without sacrificing real avatar
    // workflows (browsers and Cloudinary export to those formats).
    //
    // The pattern is intentionally case-insensitive (`(?i)`). It does
    // not allow `;charset=…` or other media-type parameters between the
    // MIME and `;base64,` — those are meaningless for raster images and
    // a permissive `(;[^;,]+)*` group is a known ReDoS shape (S5852)
    // because nested unbounded repetitions can backtrack on adversarial
    // input. Rejecting parameters costs nothing in practice (browsers
    // and Cloudinary never emit them on image data URIs) and keeps the
    // matcher linear-time.
    private static final Pattern ALLOWED_DATA_URI = Pattern.compile(
            "(?i)^data:image/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$");

    private AvatarUriHelper() {
    }

    static String safeAvatarUri(String rawAvatarUrl) {
        if (rawAvatarUrl == null || rawAvatarUrl.isBlank()) {
            return null;
        }

        if (rawAvatarUrl.startsWith("data:")) {
            // Extremely large data URLs can break proxy/browser streaming and trigger
            // incomplete chunked responses in the frontend.
            if (rawAvatarUrl.length() > MAX_AVATAR_URI_LENGTH) {
                return null;
            }
            // PINFO-216: reject anything that is not a base64-encoded raster
            // image. This blocks `data:image/svg+xml;...` (XSS via <script>),
            // `data:text/html;...` (XSS via inline HTML), and any other
            // executable MIME type a caller might try to smuggle through.
            if (!ALLOWED_DATA_URI.matcher(rawAvatarUrl).matches()) {
                return null;
            }
            return rawAvatarUrl;
        }

        // Non-data URLs (HTTPS to a CDN, etc.) — make sure it parses, return as-is.
        try {
            java.net.URI.create(rawAvatarUrl);
            return rawAvatarUrl;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
