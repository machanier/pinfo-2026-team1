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
 * Mints short-lived Cloudinary upload signatures for the authenticated user.
 *
 * <p>The browser calls this first, then uploads straight to Cloudinary with the
 * returned signature. Because the upload preset is "signed", an upload with no
 * valid signature is refused by Cloudinary, so the old "anyone can POST to the
 * public preset" abuse path is closed. This endpoint is the new gate, and it is
 * guarded twice over: Kong's JWT plugin on {@code /api/users} plus the
 * {@link RolesAllowed} check here, and a per-user rate limit so a logged-in
 * caller cannot loop it to burn quota.
 */
@Path("/api/users/me/avatar-upload-signature")
public class AvatarSignatureResource {

    private final CloudinarySignatureService signatureService;
    private final AvatarUploadRateLimiter rateLimiter;
    private final JsonWebToken jwt;

    @Inject
    public AvatarSignatureResource(CloudinarySignatureService signatureService,
                                   AvatarUploadRateLimiter rateLimiter,
                                   JsonWebToken jwt) {
        this.signatureService = signatureService;
        this.rateLimiter = rateLimiter;
        this.jwt = jwt;
    }

    @POST
    @RolesAllowed({ "STUDENT", "ORGANIZER", "ADMIN" })
    @Produces(MediaType.APPLICATION_JSON)
    public Response sign() {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        if (!signatureService.isConfigured()) {
            // Misconfiguration (e.g. an unset Doppler secret) is our fault, not
            // the client's: answer 503 so the frontend shows a transient failure
            // rather than a validation-style message. We also do not spend the
            // caller's rate-limit budget on a request we cannot fulfil.
            return Response.status(Response.Status.SERVICE_UNAVAILABLE).build();
        }

        if (!rateLimiter.tryAcquire(subject)) {
            return Response.status(Response.Status.TOO_MANY_REQUESTS).build();
        }

        AvatarUploadSignature signature = signatureService.forSubject(subject);
        return Response.ok(signature).build();
    }
}
