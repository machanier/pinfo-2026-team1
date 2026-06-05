package ch.unige.pinfo.user.service;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.runtime.StartupEvent;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AvatarUrlSchemaMigatorTest {

    @Mock
    private EntityManager entityManager;

    @Test
    void onStart_migratesColumnWhenNotText() {
        AvatarUrlSchemaMigrator migrator = new AvatarUrlSchemaMigrator();
        migrator.entityManager = entityManager;

        Query mockQuery = mock(Query.class);
        when(mockQuery.getSingleResult()).thenReturn("VARCHAR");
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);

        migrator.onStart(new StartupEvent());

        verify(entityManager, times(2)).createNativeQuery(anyString());
    }

    @Test
    void onStart_skipsAlterWhenAlreadyText() {
        AvatarUrlSchemaMigrator migrator = new AvatarUrlSchemaMigrator();
        migrator.entityManager = entityManager;

        Query mockQuery = mock(Query.class);
        when(mockQuery.getSingleResult()).thenReturn("text");
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);

        migrator.onStart(new StartupEvent());

        // Only one query should be executed (the SELECT)
        verify(entityManager).createNativeQuery(anyString());
    }

    @Test
    void onStart_handlesDatabaseExceptions() {
        AvatarUrlSchemaMigrator migrator = new AvatarUrlSchemaMigrator();
        migrator.entityManager = entityManager;

        when(entityManager.createNativeQuery(anyString())).thenThrow(new RuntimeException("DB Error"));

        // Should not throw, just log warning
        migrator.onStart(new StartupEvent());

        verify(entityManager).createNativeQuery(anyString());
    }

    @Test
    void onStart_handlesNullResult() {
        AvatarUrlSchemaMigrator migrator = new AvatarUrlSchemaMigrator();
        migrator.entityManager = entityManager;

        Query mockQuery = mock(Query.class);
        when(mockQuery.getSingleResult()).thenReturn(null);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);

        migrator.onStart(new StartupEvent());

        verify(entityManager, times(2)).createNativeQuery(anyString());
    }
}
