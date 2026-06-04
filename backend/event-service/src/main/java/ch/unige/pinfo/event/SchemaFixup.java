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
 * Patches CHECK constraints that Hibernate's 'update' strategy cannot alter
 * on existing tables. Each method is idempotent (DROP IF EXISTS + ADD) and
 * wrapped in its own try/catch so one failure never blocks the others.
 *
 * NOTE: runs in ALL profiles (dev + prod).
 */
@ApplicationScoped
public class SchemaFixup {

    @Inject
    DataSource dataSource;

    void onStart(@Observes StartupEvent ev) {
        patchEventsStatusCheck();
        patchAnnouncementsStatusCheck();
    }

    private void patchEventsStatusCheck() {
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

    /**
     * The announcements table may have been created before PENDING_MODERATION
     * was added to AnnouncementStatus. Hibernate's 'update' strategy cannot
     * alter existing CHECK constraints, so we patch it at startup.
     */
    private void patchAnnouncementsStatusCheck() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_status_check");
            stmt.execute(
                    "ALTER TABLE announcements ADD CONSTRAINT announcements_status_check " +
                    "CHECK (status IN ('PENDING_MODERATION', 'PUBLISHED', 'REJECTED'))");
            Log.info("SchemaFixup: patched announcements_status_check constraint");
        } catch (SQLException e) {
            Log.warnf("SchemaFixup: failed to patch announcements_status_check: %s", e.getMessage());
        }
    }
}
