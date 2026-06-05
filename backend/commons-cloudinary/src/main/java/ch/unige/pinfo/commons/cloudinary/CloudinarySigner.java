package ch.unige.pinfo.commons.cloudinary;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.SortedMap;
import java.util.stream.Collectors;

/**
 * Computes Cloudinary upload signatures.
 *
 * Cloudinary's signed-upload contract: take every parameter that will be sent
 * to the upload API <em>except</em> {@code file}, {@code cloud_name},
 * {@code resource_type}, {@code api_key} and {@code signature} itself; sort
 * them by key; join them as {@code key=value} pairs separated by {@code &};
 * append the raw API secret; SHA-1 the result and hex-encode it. The browser
 * then sends the same parameters plus {@code api_key} and this signature, and
 * Cloudinary recomputes the hash with its own copy of the secret to verify it.
 *
 * <p>This is deliberately a tiny pure function so it can be unit-tested against
 * Cloudinary's own documented reference vector (see {@code CloudinarySignerTest})
 * without standing up the framework or touching a real account.
 *
 * <p>SHA-1 is Cloudinary's default signature algorithm. If the account is ever
 * switched to SHA-256 signing, change {@link #sha1Hex(String)} accordingly.
 */
public final class CloudinarySigner {

    private CloudinarySigner() {
    }

    /**
     * @param paramsToSign the upload parameters to sign, already filtered to the
     *                     signable set. A {@link SortedMap} guarantees the
     *                     alphabetical key ordering Cloudinary expects.
     * @param apiSecret    the Cloudinary API secret (never leaves the server).
     * @return the lowercase hex SHA-1 signature.
     */
    public static String sign(SortedMap<String, String> paramsToSign, String apiSecret) {
        String payload = paramsToSign.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
        return sha1Hex(payload + apiSecret);
    }

    // SonarCloud raises java:S4790 (weak hashing) on this SHA-1 call. It is safe
    // here: SHA-1 is the algorithm Cloudinary REQUIRES for its upload signatures
    // (api_sign_request) — a signature over public upload parameters, not
    // password/credential hashing. Switching to SHA-256 would force a matching
    // Cloudinary account setting or every upload would 401. Reviewed and accepted.
    @SuppressWarnings("java:S4790")
    static String sha1Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1"); // NOSONAR - SHA-1 mandated by Cloudinary's signature contract, not security hashing
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-1 is guaranteed present on every JVM; this branch is unreachable.
            throw new IllegalStateException("SHA-1 algorithm unavailable", e);
        }
    }
}
