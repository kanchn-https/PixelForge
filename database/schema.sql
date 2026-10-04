-- PixelForge Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    width INTEGER NOT NULL DEFAULT 32,
    height INTEGER NOT NULL DEFAULT 32,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- PHASE 2.1 TABLES
-- ==========================================

-- 1. SCENES Table
CREATE TABLE IF NOT EXISTS scenes (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER DEFAULT 0,
    tile_data JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ASSETS Table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'sprite', 'audio'
    file_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SPRITES Table
CREATE TABLE IF NOT EXISTS sprites (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    width INTEGER NOT NULL DEFAULT 32,
    height INTEGER NOT NULL DEFAULT 32,
    pivot_x INTEGER DEFAULT 0,
    pivot_y INTEGER DEFAULT 0
);

-- 4. SPRITE_FRAMES Table (Stores Pixel Matrix)
CREATE TABLE IF NOT EXISTS sprite_frames (
    id SERIAL PRIMARY KEY,
    sprite_id INTEGER REFERENCES sprites(id) ON DELETE CASCADE,
    frame_order INTEGER NOT NULL,
    pixel_matrix JSONB NOT NULL, -- Stores the logical grid like [[0,1],[1,0]]
    duration_ms INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprite_id, frame_order) -- A sprite can't have two frames with the same order
);

-- 5. GAME_OBJECTS Table
CREATE TABLE IF NOT EXISTS game_objects (
    id SERIAL PRIMARY KEY,
    scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
    sprite_id INTEGER REFERENCES sprites(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    x INTEGER NOT NULL DEFAULT 0,
    y INTEGER NOT NULL DEFAULT 0,
    scale REAL DEFAULT 1.0,
    components JSONB, -- Stores logic triggers, colliders, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SCRIPTS Table
CREATE TABLE IF NOT EXISTS scripts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(50),
    action_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROJECT_VERSIONS Table
CREATE TABLE IF NOT EXISTS project_versions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    version_num VARCHAR(50) NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. BUILDS Table
CREATE TABLE IF NOT EXISTS builds (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    version_id INTEGER REFERENCES project_versions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    build_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_game_objects_scene_id ON game_objects(scene_id);
