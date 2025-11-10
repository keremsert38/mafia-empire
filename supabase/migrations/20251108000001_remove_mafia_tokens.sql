-- Remove mafia_tokens column from player_stats table
ALTER TABLE player_stats DROP COLUMN IF EXISTS mafia_tokens;