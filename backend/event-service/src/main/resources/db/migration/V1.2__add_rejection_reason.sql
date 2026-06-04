-- PINFO: persist the moderator's rejection reason so organizers can see why an
-- event was sent back to DRAFT. Propagated from moderation-service via the
-- event.moderated message (status REJECTED). IF NOT EXISTS keeps this idempotent
-- whether the column was already created by Hibernate `update` or not.
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
