/*
# WorldForge — Initial Schema

1. Overview
   WorldForge is a fantasy RPG with accounts, characters, and 8 worlds + a final boss.
   This migration creates the core data structure:
   - profiles: extends auth.users with a username
   - characters: stores full character creation data per user
   - world_progress: tracks each world's completion status per character

2. New Tables
   - profiles
     - id (uuid, PK, FK to auth.users)
     - username (text, unique, not null)
     - created_at (timestamptz)
   - characters
     - id (uuid, PK)
     - user_id (uuid, FK to auth.users, DEFAULT auth.uid())
     - name (text)
     - nickname (text)
     - age (text)
     - gender (text)
     - pronouns (text)
     - species (text)
     - appearance (jsonb) — hair style/color/length, eye color/type, face shape, eyebrows, mouth, height, body type, glasses, earrings, scars, birthmarks, special features
     - personality (jsonb) — brave, kind, calm, curious, confident (each 0-10, total 10)
     - primary_affinity (text)
     - secondary_affinity (text)
     - starting_class (text) — attack, defense, support
     - background (text) — free-text backstory
     - origin (text) — village, city, forest, kingdom, unknown, custom
     - level (int, default 1)
     - hp (int, default 100)
     - mp (int, default 50)
     - skill_points (int, default 0)
     - created_at (timestamptz)
   - world_progress
     - id (uuid, PK)
     - character_id (uuid, FK to characters ON DELETE CASCADE)
     - world_number (int, 1-8 for worlds, 9 for final boss)
     - status (text, default 'locked') — locked, available, in_progress, completed
     - created_at (timestamptz)
     - updated_at (timestamptz)
     - UNIQUE(character_id, world_number)

3. Security
   - RLS enabled on all three tables.
   - profiles: owner-scoped (auth.uid() = id)
   - characters: owner-scoped (auth.uid() = user_id)
   - world_progress: scoped through characters (owner of character_id)
   - All policies use auth.uid(), 4 per table (SELECT/INSERT/UPDATE/DELETE)

4. Important Notes
   - user_id on characters defaults to auth.uid() so inserts from the client work
     without explicitly passing user_id.
   - world_progress policies check ownership through the characters table.
   - World 1 is seeded as 'available' when a character is created (handled in app logic).
*/

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- characters table
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  nickname text,
  age text,
  gender text,
  pronouns text,
  species text,
  appearance jsonb DEFAULT '{}',
  personality jsonb DEFAULT '{}',
  primary_affinity text,
  secondary_affinity text,
  starting_class text,
  background text,
  origin text,
  level int NOT NULL DEFAULT 1,
  hp int NOT NULL DEFAULT 100,
  mp int NOT NULL DEFAULT 50,
  skill_points int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_characters" ON characters;
CREATE POLICY "select_own_characters" ON characters FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_characters" ON characters;
CREATE POLICY "insert_own_characters" ON characters FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_characters" ON characters;
CREATE POLICY "update_own_characters" ON characters FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_characters" ON characters;
CREATE POLICY "delete_own_characters" ON characters FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- world_progress table
CREATE TABLE IF NOT EXISTS world_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  world_number int NOT NULL,
  status text NOT NULL DEFAULT 'locked',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(character_id, world_number)
);

ALTER TABLE world_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_world_progress" ON world_progress;
CREATE POLICY "select_own_world_progress" ON world_progress FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = world_progress.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_world_progress" ON world_progress;
CREATE POLICY "insert_own_world_progress" ON world_progress FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = world_progress.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_world_progress" ON world_progress;
CREATE POLICY "update_own_world_progress" ON world_progress FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = world_progress.character_id AND characters.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = world_progress.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_world_progress" ON world_progress;
CREATE POLICY "delete_own_world_progress" ON world_progress FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = world_progress.character_id AND characters.user_id = auth.uid())
  );

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_world_progress_character_id ON world_progress(character_id);
