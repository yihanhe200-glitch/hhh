/*
# WorldForge — Add items, abilities, and exp columns

1. New Tables
   - character_items
     - id (uuid, PK)
     - character_id (uuid, FK to characters ON DELETE CASCADE)
     - item_key (text) — e.g. 'nature_core', 'small_healing_potion'
     - item_name (text)
     - item_type (text) — 'core', 'potion', 'key', 'material'
     - quantity (int, default 1)
     - world_source (int) — which world this item was obtained from
     - created_at (timestamptz)
     - UNIQUE(character_id, item_key)
   - character_abilities
     - id (uuid, PK)
     - character_id (uuid, FK to characters ON DELETE CASCADE)
     - ability_key (text) — e.g. 'nature_bolt', 'vine_shield'
     - ability_name (text)
     - ability_type (text) — 'attack', 'defense', 'support', 'ultimate'
     - world_source (int)
     - element (text) — e.g. 'Nature'
     - power (int, default 10)
     - mp_cost (int, default 5)
     - created_at (timestamptz)
     - UNIQUE(character_id, ability_key)

2. Modified Tables
   - characters: add exp (int, default 0) column

3. Security
   - RLS enabled on both new tables.
   - character_items: owner-scoped through characters table.
   - character_abilities: owner-scoped through characters table.
   - 4 policies per table (SELECT/INSERT/UPDATE/DELETE).

4. Important Notes
   - These tables support the World 1 reward system (Nature Core + abilities).
   - Items use upsert semantics (unique on character_id + item_key).
   - Abilities similarly unique per character.
*/

-- Add exp column to characters
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'exp') THEN
    ALTER TABLE characters ADD COLUMN exp int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- character_items table
CREATE TABLE IF NOT EXISTS character_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_name text NOT NULL,
  item_type text NOT NULL DEFAULT 'material',
  quantity int NOT NULL DEFAULT 1,
  world_source int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(character_id, item_key)
);

ALTER TABLE character_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_items" ON character_items;
CREATE POLICY "select_own_items" ON character_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_items.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_items" ON character_items;
CREATE POLICY "insert_own_items" ON character_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_items.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_items" ON character_items;
CREATE POLICY "update_own_items" ON character_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_items.character_id AND characters.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_items.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_items" ON character_items;
CREATE POLICY "delete_own_items" ON character_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_items.character_id AND characters.user_id = auth.uid())
  );

-- character_abilities table
CREATE TABLE IF NOT EXISTS character_abilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  ability_key text NOT NULL,
  ability_name text NOT NULL,
  ability_type text NOT NULL DEFAULT 'attack',
  world_source int,
  element text,
  power int NOT NULL DEFAULT 10,
  mp_cost int NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  UNIQUE(character_id, ability_key)
);

ALTER TABLE character_abilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_abilities" ON character_abilities;
CREATE POLICY "select_own_abilities" ON character_abilities FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_abilities.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_abilities" ON character_abilities;
CREATE POLICY "insert_own_abilities" ON character_abilities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_abilities.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_abilities" ON character_abilities;
CREATE POLICY "update_own_abilities" ON character_abilities FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_abilities.character_id AND characters.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_abilities.character_id AND characters.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_abilities" ON character_abilities;
CREATE POLICY "delete_own_abilities" ON character_abilities FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM characters WHERE characters.id = character_abilities.character_id AND characters.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_character_items_character_id ON character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_character_abilities_character_id ON character_abilities(character_id);
