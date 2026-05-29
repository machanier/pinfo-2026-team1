package ch.unige.pinfo.commons.cloudinary;

import org.junit.jupiter.api.Test;

import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CloudinarySignerTest {

    // Cloudinary's signing contract for params {public_id, timestamp} with
    // secret "abcd": sort by key, join as key=value with '&', append the secret
    // with no separator, then SHA-1. That builds the string
    // "public_id=sample_image&timestamp=1315060510abcd", whose SHA-1 (verify with
    // `printf %s '<string>' | shasum -a 1`) is pinned below so any change to that
    // contract (param ordering, join char, secret placement) fails loudly here
    // instead of silently producing uploads Cloudinary rejects in production.
    @Test
    void sign_matchesCloudinaryReferenceVector() {
        TreeMap<String, String> params = new TreeMap<>();
        params.put("public_id", "sample_image");
        params.put("timestamp", "1315060510");

        assertEquals("b4ad47fb4e25c7bf5f92a20089f9db59bc302313",
                CloudinarySigner.sign(params, "abcd"));
    }

    @Test
    void sign_ordersParametersAlphabeticallyRegardlessOfInsertion() {
        // Insert out of order; a SortedMap must still produce the alphabetical
        // signing string "public_id=...&timestamp=...".
        TreeMap<String, String> params = new TreeMap<>();
        params.put("timestamp", "1315060510");
        params.put("public_id", "sample_image");

        assertEquals("b4ad47fb4e25c7bf5f92a20089f9db59bc302313",
                CloudinarySigner.sign(params, "abcd"));
    }

    @Test
    void sha1Hex_isStableLowercaseHex() {
        // The canonical SHA-1("abc") test vector.
        assertEquals("a9993e364706816aba3e25717850c26c9cd0d89d",
                CloudinarySigner.sha1Hex("abc"));
    }
}
