package ch.unige.pinfo.event.resource;

import ch.unige.pinfo.commons.cloudinary.AvatarUploadRateLimiter;
import ch.unige.pinfo.commons.cloudinary.AvatarUploadSignature;
import ch.unige.pinfo.commons.cloudinary.CloudinarySignatureService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * Mints short-lived Cloudinary signatures for EVENT-BANNER uploads (PINFO-228).
 *
 * <p>Hosted in event-service so banner-domain operations live with the events,
 * mirroring {@code AvatarSignatureResource} in user-service for avatars. The
 * actual signing logic comes from the shared {@code commons-cloudinary} module
 * so both services use the exact same signer / rate-limiter / payload — only
 * the {@code api-secret} has to be mounted into whichever service mints
 * signatures (today user-service for avatars and event-service for banners).
 *
 * <p>Guardrails: Kong's JWT plugin on POST {@code /api/events} +
 * {@link RolesAllowed} (organizers/admins, who own events) + a per-user rate
 * limit so a logged-in caller cannot loop the endpoint to burn Cloudinary
 * quota.
 */
@Path("/api/events/banner-upload-signature")
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
            // Misconfiguration (e.g. an unset Doppler/k8s secret) is our fault,
            // not the client's: answer 503 so the frontend shows a transient
            // failure rather than a validation-style message. We also do not
            // spend the caller's rate-limit budget on a request we cannot fulfil.
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
