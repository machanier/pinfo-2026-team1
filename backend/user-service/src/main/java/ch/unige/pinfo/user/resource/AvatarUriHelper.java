package ch.unige.pinfo.user.resource;

final class AvatarUriHelper {

    private static final int MAX_AVATAR_URI_LENGTH = 32768;

    private AvatarUriHelper() {
    }

    static String safeAvatarUri(String rawAvatarUrl) {
        if (rawAvatarUrl == null || rawAvatarUrl.isBlank()) {
            return null;
        }

        // Extremely large data URLs can break proxy/browser streaming and trigger
        // incomplete chunked responses in the frontend.
        if (rawAvatarUrl.startsWith("data:") && rawAvatarUrl.length() > MAX_AVATAR_URI_LENGTH) {
            return null;
        }

        // Validate that it's a well-formed URI before returning
        try {
            java.net.URI.create(rawAvatarUrl);
            return rawAvatarUrl;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
