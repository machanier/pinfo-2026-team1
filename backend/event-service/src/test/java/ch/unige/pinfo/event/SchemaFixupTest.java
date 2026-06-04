package ch.unige.pinfo.event;

import io.quarkus.runtime.StartupEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SchemaFixupTest {

    @Mock
    DataSource dataSource;

    @Mock
    Connection connection;

    @Mock
    Statement statement;

    private SchemaFixup schemaFixup;

    @BeforeEach
    void setUp() {
        schemaFixup = new SchemaFixup();
        schemaFixup.dataSource = dataSource;
    }

    @Test
    void onStart_executesAlterTableStatements() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.createStatement()).thenReturn(statement);

        schemaFixup.onStart(new StartupEvent());

        // events constraint
        verify(statement).execute("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
        verify(statement).execute(
                "ALTER TABLE events ADD CONSTRAINT events_status_check " +
                        "CHECK (status IN ('DRAFT', 'PENDING_MODERATION', 'PUBLISHED', 'CANCELLED'))");
        // announcements constraint (added alongside events fix)
        verify(statement).execute("ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_status_check");
        verify(statement).execute(
                "ALTER TABLE announcements ADD CONSTRAINT announcements_status_check " +
                        "CHECK (status IN ('PENDING_MODERATION', 'PUBLISHED', 'REJECTED'))");
        // each patch method opens its own connection
        verify(connection, times(2)).close();
        verify(statement, times(2)).close();
    }

    @Test
    void onStart_sqlExceptionIsCaughtAndDoesNotPropagate() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.execute(anyString())).thenThrow(new SQLException("constraint error"));

        assertDoesNotThrow(() -> schemaFixup.onStart(new StartupEvent()));
    }

    @Test
    void onStart_dataSourceGetConnectionFailsGracefully() throws SQLException {
        when(dataSource.getConnection()).thenThrow(new SQLException("no connection"));

        assertDoesNotThrow(() -> schemaFixup.onStart(new StartupEvent()));
    }
}
