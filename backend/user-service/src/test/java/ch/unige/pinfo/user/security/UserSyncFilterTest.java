package ch.unige.pinfo.user.security;

import ch.unige.pinfo.user.service.UserSyncService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.ws.rs.container.ContainerRequestContext;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;
import jakarta.inject.Inject;

import java.io.IOException;

import static org.mockito.Mockito.*;

@QuarkusTest
public class UserSyncFilterTest {

    @Inject
    UserSyncFilter userSyncFilter;

    @InjectMock
    JsonWebToken jwt;

    @InjectMock
    UserSyncService userSyncService;

    @Test
    void testFilter_callsSyncUserWhenSubjectPresent() throws IOException {
        when(jwt.getSubject()).thenReturn("auth0|123");
        ContainerRequestContext ctx = mock(ContainerRequestContext.class);

        userSyncFilter.filter(ctx);

        verify(userSyncService, times(1)).syncUser();
    }

    @Test
    void testFilter_doesNotCallSyncUserWhenSubjectNull() throws IOException {
        when(jwt.getSubject()).thenReturn(null);
        ContainerRequestContext ctx = mock(ContainerRequestContext.class);

        userSyncFilter.filter(ctx);

        verify(userSyncService, never()).syncUser();
    }

    @Test
    void testFilter_doesNotInteractWithRequestContext() throws IOException {
        when(jwt.getSubject()).thenReturn("auth0|123");
        ContainerRequestContext ctx = mock(ContainerRequestContext.class);

        userSyncFilter.filter(ctx);

        verifyNoInteractions(ctx);
    }
}