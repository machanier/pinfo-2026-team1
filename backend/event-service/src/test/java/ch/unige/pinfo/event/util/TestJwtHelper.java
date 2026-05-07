package ch.unige.pinfo.event.util;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Helper utility for JWT and Auth0 subject handling in tests.
 */
public final class TestJwtHelper {

    private TestJwtHelper() {
        // Utility class, no instantiation
    }

    /**
     * Derives a UUID from an Auth0 subject string.
     * Tries to parse the subject as a UUID first (for direct UUID formats).
     * If that fails, generates a UUID from the subject bytes using
     * nameUUIDFromBytes
     *
     * @param auth0Subject the Auth0 subject string (e.g., "auth0|organizer-123" or
     *                     a UUID string)
     * @return the derived UUID
     */
    public static UUID getOrganizerIdFromAuth0(String auth0Subject) {
        try {
            return UUID.fromString(auth0Subject);
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(auth0Subject.getBytes(StandardCharsets.UTF_8));
        }
    }
}
