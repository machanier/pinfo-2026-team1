-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    auth0_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    faculty VARCHAR(255),
    major VARCHAR(255),
    degree_level VARCHAR(50),
    association_name VARCHAR(255),
    association_description TEXT,
    association_verified BOOLEAN,
    association_logo_url VARCHAR(255)
);

-- Insert test data
INSERT INTO users (id, auth0_id, name, role, faculty, major, degree_level, created_at)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'auth0|student1', 'Alice Dupont', 'STUDENT', 'Sciences', 'Computer Science', 'BACHELOR', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO users (id, auth0_id, name, role, faculty, major, degree_level, created_at)
VALUES ('223e4567-e89b-12d3-a456-426614174000', 'auth0|student2', 'Bob Martin', 'STUDENT', 'Sciences', 'Computer Science', 'MASTER', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO users (id, auth0_id, name, role, faculty, major, degree_level, created_at)
VALUES ('323e4567-e89b-12d3-a456-426614174000', 'auth0|student3', 'Charlie Rousseau', 'STUDENT', 'Engineering', 'Mechanical Engineering', 'BACHELOR', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO users (id, auth0_id, name, role, created_at)
VALUES ('523e4567-e89b-12d3-a456-426614174000', 'auth0|organizer1', 'Event Manager', 'ORGANIZER', NOW())
ON CONFLICT DO NOTHING;