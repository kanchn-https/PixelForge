-- ==========================================
-- PHASE 2.2: DATABASE TESTING QUERIES
-- ==========================================
-- This file contains examples of how we interact with the PixelForge database.
-- It demonstrates CRUD operations, JOINs, and Transactions.

-- 1. TRANSACTION with ROLLBACK
-- Let's say we try to create a user but something goes wrong. We want to cancel it.
BEGIN;
INSERT INTO users (id, username, email, password_hash) 
VALUES (999, 'error_user', 'error@example.com', 'hash123');
-- Oops, we don't want this user. Undo the transaction!
ROLLBACK;

-- 2. TRANSACTION with COMMIT (Real Data Insertion)
-- We use a transaction so if one insert fails, they all fail. We don't want a project without a user!
BEGIN;
-- INSERT (Create): Add a new user
INSERT INTO users (id, username, email, password_hash) 
VALUES (1, 'pixelmaster', 'pixel@forge.com', 'safehash')
ON CONFLICT (id) DO NOTHING;

-- INSERT: Add a new project belonging to user 1
INSERT INTO projects (id, user_id, title, width, height) 
VALUES (1, 1, 'My First Game', 32, 32)
ON CONFLICT (id) DO NOTHING;

-- INSERT: Create an asset (the parent of a sprite)
INSERT INTO assets (id, project_id, name, type) 
VALUES (1, 1, 'Hero', 'sprite')
ON CONFLICT (id) DO NOTHING;

-- INSERT: Define the specific sprite dimensions
INSERT INTO sprites (id, asset_id, width, height) 
VALUES (1, 1, 32, 32)
ON CONFLICT (id) DO NOTHING;

-- INSERT: Save a frame's pixel matrix (This is how the React UI will save drawn pixels!)
INSERT INTO sprite_frames (sprite_id, frame_order, pixel_matrix)
VALUES (1, 1, '[[0, 1], [1, 0]]');
COMMIT;

-- 3. SELECT and JOIN (Reading Data)
-- We want to load the project, but we need the sprite and the frame data all together.
-- JOIN combines data from 4 tables based on their Foreign Keys.
SELECT 
    p.title AS project_name, 
    a.name AS asset_name, 
    f.frame_order, 
    f.pixel_matrix
FROM projects p
JOIN assets a ON p.id = a.project_id
JOIN sprites s ON a.id = s.asset_id
JOIN sprite_frames f ON s.id = f.sprite_id
WHERE p.id = 1;

-- 4. UPDATE
-- The user changes the name of their project in the settings menu.
UPDATE projects 
SET title = 'Super Pixel Adventure', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- 5. DELETE
-- The user deletes their project. 
-- Because we used ON DELETE CASCADE on our foreign keys, this single command 
-- will automatically delete the project, assets, sprites, and frames from the DB!
DELETE FROM projects WHERE id = 1;
