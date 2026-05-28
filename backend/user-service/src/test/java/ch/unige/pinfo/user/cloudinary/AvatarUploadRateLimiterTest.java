package ch.unige.pinfo.user.cloudinary;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AvatarUploadRateLimiterTest {

    private AvatarUploadRateLimiter limiter(int max, long windowSeconds) {
        return new AvatarUploadRateLimiter(max, windowSeconds);
    }

    @Test
    void allowsUpToMaxThenBlocksWithinSameWindow() {
        AvatarUploadRateLimiter limiter = limiter(3, 3600);
        long now = 1_000_000L;

        assertTrue(limiter.tryAcquire("user-a", now));
        assertTrue(limiter.tryAcquire("user-a", now + 1));
        assertTrue(limiter.tryAcquire("user-a", now + 2));
        assertFalse(limiter.tryAcquire("user-a", now + 3)); // 4th within window → blocked
    }

    @Test
    void resetsBudgetOnceWindowElapses() {
        AvatarUploadRateLimiter limiter = limiter(1, 60);
        long now = 5_000_000L;

        assertTrue(limiter.tryAcquire("user-b", now));
        assertFalse(limiter.tryAcquire("user-b", now + 59_000)); // still inside the 60s window
        assertTrue(limiter.tryAcquire("user-b", now + 60_000));  // window rolled over
    }

    @Test
    void keepsAnIndependentBudgetPerKey() {
        AvatarUploadRateLimiter limiter = limiter(1, 3600);
        long now = 9_000_000L;

        assertTrue(limiter.tryAcquire("user-c", now));
        assertFalse(limiter.tryAcquire("user-c", now + 1)); // user-c exhausted
        assertTrue(limiter.tryAcquire("user-d", now + 1));  // different user, own budget
    }
}
