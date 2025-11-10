-- Remove mafia_tokens and influence columns
ALTER TABLE player_stats
DROP COLUMN IF EXISTS mafia_tokens,
DROP COLUMN IF EXISTS influence;