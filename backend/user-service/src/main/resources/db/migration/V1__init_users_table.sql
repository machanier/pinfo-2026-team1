-- ────────────────────────────────────────────────────────────────────────────
-- V1 — Pre-Flyway baseline (PINFO-195).
--
-- This script captures the schema that Hibernate's `update` generation has
-- created in every existing user-service Postgres up to PINFO-195.
-- On any database that ALREADY has those tables (i.e. every existing prod
-- cluster), Flyway is configured with `baseline-on-migrate=true` and will
-- record this version as the baseline WITHOUT executing the SQL — so a
-- mismatch between the statements below and the live schema does not break
-- existing deploys. The script only runs on a brand-new database.
--
-- That said, the schema below is what Hibernate would emit for the current
-- entity classes (User + Student + Association, JOINED inheritance) under
-- the JPA-compliant naming strategy that Quarkus 3.x uses by default. PG
-- folds unquoted identifiers to lowercase, so column names like `auth0Id`
-- become `auth0id` on disk.
--
-- Adding any future schema change: create V2__<description>.sql in this
-- directory and DO NOT touch this file. See docs/MIGRATIONS.md.
-- ────────────────────────────────────────────────────────────────────────────

-- Parent table for the JOINED inheritance hierarchy.
CREATE TABLE IF NOT EXISTS users (
    id          UUID            NOT NULL,
    auth0id     VARCHAR(255)    NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    role        VARCHAR(255)    NOT NULL,
    avatarurl   VARCHAR(255),
    active      BOOLEAN         NOT NULL,
    createdat   TIMESTAMPTZ     NOT NULL,
    email       VARCHAR(255)    NOT NULL,
    CONSTRAINT  pk_users        PRIMARY KEY (id),
    CONSTRAINT  uk_users_auth0  UNIQUE (auth0id),
    CONSTRAINT  uk_users_email  UNIQUE (email)
);

-- Child table for the Student subclass. PK is also FK to users(id) — the
-- JOINED strategy guarantees one row in `student` per student row in
-- `users`, with the same UUID.
CREATE TABLE IF NOT EXISTS student (
    id           UUID           NOT NULL,
    faculty      VARCHAR(255)   NOT NULL,
    major        VARCHAR(255)   NOT NULL,
    degreelevel  VARCHAR(255)   NOT NULL,
    CONSTRAINT   pk_student     PRIMARY KEY (id),
    CONSTRAINT   fk_student_user FOREIGN KEY (id) REFERENCES users (id)
);

-- Child table for the Association subclass.
CREATE TABLE IF NOT EXISTS association (
    id           UUID           NOT NULL,
    description  VARCHAR(255)   NOT NULL,
    CONSTRAINT   pk_association PRIMARY KEY (id),
    CONSTRAINT   fk_association_user FOREIGN KEY (id) REFERENCES users (id)
);
