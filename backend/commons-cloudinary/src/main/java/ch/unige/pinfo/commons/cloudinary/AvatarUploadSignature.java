package ch.unige.pinfo.commons.cloudinary;

/**
 * The signed-upload payload handed to the browser. It carries everything the
 * client needs to POST directly to Cloudinary, but never the API secret: the
 * secret is used server-side to produce {@link #signature()} and stays there.
 *
 * <p>The client must echo {@link #timestamp()}, {@link #publicId()},
 * {@link #overwrite()} and {@link #uploadPreset()} back to Cloudinary verbatim;
 * any mismatch makes Cloudinary recompute a different hash and reject the upload.
 */
public record AvatarUploadSignature(
        String cloudName,
        String apiKey,
        long timestamp,
        String publicId,
        boolean overwrite,
        String uploadPreset,
        String signature) {
}
