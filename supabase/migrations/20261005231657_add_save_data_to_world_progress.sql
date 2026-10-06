/*
# Add save_data column to world_progress

1. Changes
- Add `save_data` column (jsonb, nullable) to `world_progress` table.
- This stores in-progress game state (level, position, HP, MP, energy, etc.)
  so players can quit mid-level and resume from the exact same point.
- No security changes — existing RLS policies on world_progress remain unchanged.
2. Notes
- The column is nullable so existing rows are unaffected.
- save_data is cleared (set to null) when a world is marked 'completed'.
*/

ALTER TABLE world_progress
ADD COLUMN IF NOT EXISTS save_data jsonb;
