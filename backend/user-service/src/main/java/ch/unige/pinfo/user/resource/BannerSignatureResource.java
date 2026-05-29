package ch.unige.pinfo.user.resource;

import ch.unige.pinfo.user.cloudinary.AvatarUploadRateLimiter;
import ch.unige.pinfo.user.cloudinary.AvatarUploadSignature;
import ch.unige.pinfo.user.cloudinary.CloudinarySignatureService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * Mints short-lived Cloudinary signatures for EVENT-BANNER uploads (PINFO-228) —
 * the banner counterpart of {@link AvatarSignatureResource}. Same guarantees:
 * signing lets the {@code unigevents_banner} preset be flipped to "signed" so
 * anonymous banner uploads are refused, and the endpoint is guarded by Kong's
 * JWT plugin + {@link RolesAllowed} (organizers/admins, who own events) + a
 * per-user rate limit. The shared {@link AvatarUploadSignature} payload type is
 * reused (its fields are generic, not avatar-specific).
 */
@Path("/api/users/me/banner-upload-signature")
public class BannerSignatureResource {

    private final CloudinarySignatureService signatureService;
    private final AvatarUploadRateLimiter rateLimiter;
    private final JsonWebToken jwt;

    @Inject
    public BannerSignatureResource(CloudinarySignatureService signatureService,
                                   AvatarUploadRateLimiter rateLimiter,
                                   JsonWebToken jwt) {
        this.signatureService = signatureService;
        this.rateLimiter = rateLimiter;
        this.jwt = jwt;
    }

    @POST
    @RolesAllowed({ "ORGANIZER", "ADMIN" })
    @Produces(MediaType.APPLICATION_JSON)
    public Response sign() {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        if (!signatureService.isBannerConfigured()) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE).build();
        }

        // Separate rate-limit budget from avatars (distinct key prefix) so banner
        // uploads and avatar uploads can't exhaust each other.
        if (!rateLimiter.tryAcquire("banner:" + subject)) {
            return Response.status(Response.Status.TOO_MANY_REQUESTS).build();
        }

        AvatarUploadSignature signature = signatureService.forBanner(subject);
        return Response.ok(signature).build();
    }
}
