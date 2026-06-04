-- PINFO: Create announcements table.
-- Previously the table was created implicitly by Hibernate's schema-management
-- strategy=update, which is unreliable when the production DB user lacks DDL
-- privileges. A missing table causes every POST /api/events/{id}/announcements
-- to fail with HTTP 500 (PersistenceException -> RollbackException, not caught
-- by the IllegalArgumentException handler in AnnouncementResource).
CREATE TABLE IF NOT EXISTS announcements (
    announcement_id UUID PRIMARY KEY,
    event_id        UUID NOT NULL,
    organizer_id    UUID NOT NULL,
    body            VARCHAR(2000) NOT NULL,
    status          VARCHAR(50) NOT NULL CHECK (status IN ('PENDING_MODERATION', 'PUBLISHED', 'REJECTED')),
    posted_at       TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_announcement_event FOREIGN KEY (event_id) REFERENCES events(event_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_event_status ON announcements(event_id, status);
