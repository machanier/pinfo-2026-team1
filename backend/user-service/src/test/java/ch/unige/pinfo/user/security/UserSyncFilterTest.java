package ch.unige.pinfo.user.security;

import ch.unige.pinfo.user.service.UserSyncService;
import jakarta.ws.rs.container.ContainerRequestContext;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSyncFilterTest {

    @Mock
    JsonWebToken jwt;

    @Mock
    UserSyncService userSyncService;

    @InjectMocks
    UserSyncFilter userSyncFilter;

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