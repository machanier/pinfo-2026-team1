package ch.unige.pinfo.event;

import io.quarkus.logging.Log;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Fixes the events_status_check constraint created by Hibernate's 'update'
 * strategy before PENDING_MODERATION was added to EventStatus. Hibernate's
 * update strategy cannot alter existing CHECK constraints, so we patch it
 * at startup via JDBC after the SessionFactory has been initialized.
 *
 * NOTE: runs in ALL profiles (dev + prod). The DROP IF EXISTS / ADD CONSTRAINT
 * sequence is idempotent: if the constraint already has the right definition it
 * is simply recreated; the catch block absorbs any unexpected SQL error so the
 * application still starts.
 */
@ApplicationScoped
public class SchemaFixup {

    @Inject
    DataSource dataSource;

    void onStart(@Observes StartupEvent ev) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            stmt.execute(
                    "ALTER TABLE events ADD CONSTRAINT events_status_check " +
                    "CHECK (status IN ('DRAFT', 'PENDING_MODERATION', 'PUBLISHED', 'CANCELLED'))");
            Log.info("SchemaFixup: patched events_status_check constraint");
        } catch (SQLException e) {
            Log.warnf("SchemaFixup: failed to patch events_status_check: %s", e.getMessage());
        }
    }
}
