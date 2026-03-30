package ch.unige.pinfo.user.service;

import ch.unige.pinfo.user.model.User;
import ch.unige.pinfo.user.repository.UserRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSyncServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    JsonWebToken jwt;

    @InjectMocks
    UserSyncService userSyncService;

    @SuppressWarnings("unchecked")
    private PanacheQuery<User> mockQuery(Optional<User> result) {
        PanacheQuery<User> query = mock(PanacheQuery.class);
        when(query.firstResultOptional()).thenReturn(result);
        return query;
    }

    @BeforeEach
    void setUp() {
        when(jwt.getSubject()).thenReturn("auth0|123");
    }

    @Test
    void testSyncUser_nullSubject_doesNothing() {
        when(jwt.getSubject()).thenReturn(null);
        userSyncService.syncUser();
        verifyNoInteractions(userRepository);
    }

    @Test
    void testSyncUser_newUser_isPersisted() {
        when(jwt.getClaim("email")).thenReturn("test@unige.ch");
        when(jwt.getClaim("name")).thenReturn("Test User");
        when(jwt.getClaim("picture")).thenReturn("https://pic.com/photo.jpg");
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);
        PanacheQuery<User> query = mockQuery(Optional.empty());
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);

        userSyncService.syncUser();

        verify(userRepository).persist(argThat((User u) -> "auth0|123".equals(u.auth0Id) &&
                "test@unige.ch".equals(u.getEmail()) &&
                "Test User".equals(u.getName()) &&
                "https://pic.com/photo.jpg".equals(u.getPicture())));
    }

    @Test
    void testSyncUser_existingUser_isNotPersisted() {
        User existing = new User();
        existing.auth0Id = "auth0|123";
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);
        PanacheQuery<User> query = mockQuery(Optional.of(existing));
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);

        userSyncService.syncUser();

        verify(userRepository, never()).persist(any(User.class));
        verify(userRepository).flush();
    }

    @Test
    void testSyncUser_roleIsSetFromJwtClaim() {
        User existing = new User();
        existing.auth0Id = "auth0|123";
        PanacheQuery<User> query = mockQuery(Optional.of(existing));
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(List.of("Admin"));

        userSyncService.syncUser();

        assertEquals("Admin", existing.getRole());
    }

    @Test
    void testSyncUser_roleWithQuotesIsStripped() {
        User existing = new User();
        existing.auth0Id = "auth0|123";
        PanacheQuery<User> query = mockQuery(Optional.of(existing));
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(List.of("\"Organizer\""));

        userSyncService.syncUser();

        assertEquals("Organizer", existing.getRole());
    }

    @Test
    void testSyncUser_emptyRolesCollection_roleNotSet() {
        User existing = new User();
        existing.auth0Id = "auth0|123";
        existing.setRole("Student");
        PanacheQuery<User> query = mockQuery(Optional.of(existing));
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(List.of());

        userSyncService.syncUser();

        assertEquals("Student", existing.getRole());
    }

    @Test
    void testSyncUser_nullRolesClaim_roleNotSet() {
        User existing = new User();
        existing.auth0Id = "auth0|123";
        existing.setRole("Student");
        PanacheQuery<User> query = mockQuery(Optional.of(existing));
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);

        userSyncService.syncUser();

        assertEquals("Student", existing.getRole());
    }

    @Test
    void testSyncUser_flushIsCalledAfterSync() {
        User existing = new User();
        existing.auth0Id = "auth0|123";
        PanacheQuery<User> query = mockQuery(Optional.of(existing));
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);

        userSyncService.syncUser();

        verify(userRepository).flush();
    }

    @Test
    void testSyncUser_nullClaimReturnsNull() {
        when(jwt.getClaim("email")).thenReturn(null);
        when(jwt.getClaim("name")).thenReturn(null);
        when(jwt.getClaim("picture")).thenReturn(null);
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);
        PanacheQuery<User> query = mockQuery(Optional.empty());
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);

        userSyncService.syncUser();

        verify(userRepository).persist(argThat((User u) -> u.getEmail() == null &&
                u.getName() == null &&
                u.getPicture() == null));
    }

    @Test
    void testSyncUser_claimWithQuotesIsStripped() {
        when(jwt.getClaim("email")).thenReturn("\"quoted@unige.ch\"");
        when(jwt.getClaim("name")).thenReturn(null);
        when(jwt.getClaim("picture")).thenReturn(null);
        when(jwt.getClaim("https://unigevents.com/roles")).thenReturn(null);
        PanacheQuery<User> query = mockQuery(Optional.empty());
        when(userRepository.find("auth0Id", "auth0|123")).thenReturn(query);

        userSyncService.syncUser();

        verify(userRepository).persist(argThat((User u) -> "quoted@unige.ch".equals(u.getEmail())));
    }
}