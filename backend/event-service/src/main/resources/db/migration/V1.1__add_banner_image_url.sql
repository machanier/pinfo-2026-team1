-- PINFO: add optional banner image URL column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
