-- PixelForge Initial Seed Data

INSERT INTO users (username, email, password_hash)
VALUES ('demo_artist', 'demo@pixelforge.dev', 'hashed_demo_password')
ON CONFLICT DO NOTHING;
