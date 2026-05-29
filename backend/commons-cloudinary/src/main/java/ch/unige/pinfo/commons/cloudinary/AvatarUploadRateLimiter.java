package ch.unige.pinfo.commons.cloudinary;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-user fixed-window rate limiter for avatar-upload signatures.
 *
 * <p>Signing moves the "who may upload" gate from "anyone with the public
 * preset" to "whoever can get a signature from us", so this caps how many
 * signatures one authenticated user can mint per window. A logged-in attacker
 * therefore cannot just loop the endpoint to burn Cloudinary quota.
 *
 * <p>We key on the JWT subject, <em>not</em> the client IP, on purpose: UNIGE
 * users share campus egress IPs, so an IP-based limit would throttle legitimate
 * users while an attacker simply hops networks. The counter lives in-process
 * (single replica, mirroring Kong's {@code policy: local}); if user-service is
 * ever scaled horizontally, move this to a shared store (e.g. Redis) so the
 * budget is global instead of per-replica.
 */
@ApplicationScoped
public class AvatarUploadRateLimiter {

    private final int maxPerWindow;
    private final long windowMillis;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Inject
    public AvatarUploadRateLimiter(
            @ConfigProperty(name = "cloudinary.avatar.rate-limit.max") int maxPerWindow,
            @ConfigProperty(name = "cloudinary.avatar.rate-limit.window-seconds") long windowSeconds) {
        this.maxPerWindow = maxPerWindow;
        this.windowMillis = Duration.ofSeconds(windowSeconds).toMillis();
    }

    /** @return true if the caller is within budget (and consumes one slot). */
    public boolean tryAcquire(String key) {
        return tryAcquire(key, System.currentTimeMillis());
    }

    // Package-visible overload with an injectable clock for deterministic tests.
    boolean tryAcquire(String key, long nowMillis) {
        Window updated = windows.compute(key, (ignored, current) -> {
            if (current == null || nowMillis - current.startMillis() >= windowMillis) {
                return new Window(nowMillis, 1);
            }
            return new Window(current.startMillis(), current.count() + 1);
        });
        return updated.count() <= maxPerWindow;
    }

    private record Window(long startMillis, int count) {
    }
}
