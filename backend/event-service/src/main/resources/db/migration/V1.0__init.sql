-- Create events table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    place VARCHAR(255) NOT NULL,
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    organizer_id UUID NOT NULL,
    organizer_name VARCHAR(255),
    capacity INTEGER,
    registered_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    category VARCHAR(255),
    tags VARCHAR(255),
    restricted_to_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
    registration_id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES events(event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_status ON event_registrations(event_id, status);

-- Insert test data
INSERT INTO events (event_id, title, description, place, time, end_time, organizer_id, organizer_name, capacity, registered_count, status, category, tags, restricted_to_json, created_at, updated_at)
VALUES ('111e4567-e89b-12d3-a456-426614174000', 'Introduction to Web Development', 'Learn modern web development', 'Room 101', '2026-04-15T14:00:00Z', '2026-04-15T16:00:00Z', '523e4567-e89b-12d3-a456-426614174000', 'Tech Club', 50, 0, 'PUBLISHED', 'Academic', 'ev1', '{"faculties":["Sciences"],"majors":["Computer Science"],"degreeLevels":["BACHELOR","MASTER"]}', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO events (event_id, title, description, place, time, end_time, organizer_id, organizer_name, capacity, registered_count, status, category, tags, restricted_to_json, created_at, updated_at)
VALUES ('222e4567-e89b-12d3-a456-426614174000', 'General Assembly Meeting', 'Yearly meeting of all members', 'Auditorium', '2026-04-20T18:00:00Z', '2026-04-20T20:00:00Z', '523e4567-e89b-12d3-a456-426614174000', 'Tech Club', 100, 0, 'PUBLISHED', 'Social', 'ev2', NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO events (event_id, title, description, place, time, end_time, organizer_id, organizer_name, capacity, registered_count, status, category, tags, restricted_to_json, created_at, updated_at)
VALUES ('333e4567-e89b-12d3-a456-426614174000', 'Advanced Robotics Workshop', 'Deep dive into robotics', 'Lab 205', '2026-05-10T10:00:00Z', '2026-05-10T12:00:00Z', '523e4567-e89b-12d3-a456-426614174000', 'Tech Club', 30, 0, 'PUBLISHED', 'Academic', 'ev3', '{"faculties":["Engineering"],"majors":[],"degreeLevels":[]}', NOW(), NOW())
ON CONFLICT DO NOTHING;