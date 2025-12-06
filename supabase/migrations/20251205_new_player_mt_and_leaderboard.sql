-- Migration: Add 500 MT for new players and improve leaderboard
-- Date: 2024-12-05

-- 1. Update ensure_user_initialized function to give new players 500 MT
CREATE OR REPLACE FUNCTION ensure_user_initialized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_email text;
    v_username text;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get user email from auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    
    -- Generate username from email
    v_username := COALESCE(split_part(v_email, '@', 1), 'Oyuncu');

    -- Initialize player_stats if not exists
    INSERT INTO player_stats (
        id, 
        username, 
        level, 
        cash, 
        energy, 
        soldiers, 
        respect, 
        reputation, 
        experience, 
        experience_to_next,
        strength,
        defense,
        speed,
        intelligence,
        charisma,
        available_points,
        rank,
        territories,
        total_earnings,
        battles_won,
        battles_lost,
        mt_coins,  -- NEW: Start with 500 MT
        last_active,
        join_date
    )
    VALUES (
        v_user_id,
        v_username,
        1,      -- level
        1000,   -- cash
        100,    -- energy
        0,      -- soldiers
        0,      -- respect
        0,      -- reputation
        0,      -- experience
        100,    -- experience_to_next
        10,     -- strength
        10,     -- defense
        10,     -- speed
        10,     -- intelligence
        10,     -- charisma
        0,      -- available_points
        'Soldato', -- rank
        0,      -- territories
        0,      -- total_earnings
        0,      -- battles_won
        0,      -- battles_lost
        500,    -- mt_coins (NEW: 500 MT for new players)
        NOW(),  -- last_active
        NOW()   -- join_date
    )
    ON CONFLICT (id) DO NOTHING;

    -- Initialize user_soldiers if not exists
    INSERT INTO user_soldiers (user_id, soldiers)
    VALUES (v_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

END;
$$;

-- 2. Drop existing leaderboard function first (required for return type change)
DROP FUNCTION IF EXISTS get_leaderboard_by_type(text, integer);

-- 3. Improve leaderboard function with better sorting
CREATE OR REPLACE FUNCTION get_leaderboard_by_type(
    leaderboard_type text,
    limit_count integer DEFAULT 100
)
RETURNS TABLE (
    player_id uuid,
    player_name text,
    rank_name text,
    player_level integer,
    score bigint,
    player_rank bigint,
    profile_image text,
    territories integer,
    is_active boolean,
    last_active timestamptz,
    score_change integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id as player_id,
        ps.username as player_name,
        ps.rank as rank_name,
        ps.level as player_level,
        CASE leaderboard_type
            WHEN 'level' THEN ps.level::bigint
            WHEN 'respect' THEN ps.respect::bigint
            WHEN 'territories' THEN ps.territories::bigint
            ELSE ps.level::bigint
        END as score,
        ROW_NUMBER() OVER (
            ORDER BY 
                CASE leaderboard_type
                    WHEN 'level' THEN ps.level
                    WHEN 'respect' THEN ps.respect
                    WHEN 'territories' THEN ps.territories
                    ELSE ps.level
                END DESC,
                ps.experience DESC,  -- Secondary sort by experience
                ps.last_active DESC   -- Tertiary sort by activity
        ) as player_rank,
        ps.profile_image,
        ps.territories::integer,
        (ps.last_active > NOW() - INTERVAL '5 minutes') as is_active,
        ps.last_active,
        0 as score_change  -- Placeholder for future feature
    FROM player_stats ps
    WHERE ps.username IS NOT NULL
      AND ps.username != ''
    ORDER BY 
        CASE leaderboard_type
            WHEN 'level' THEN ps.level
            WHEN 'respect' THEN ps.respect
            WHEN 'territories' THEN ps.territories
            ELSE ps.level
        END DESC,
        ps.experience DESC,
        ps.last_active DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_leaderboard_by_type(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_initialized() TO authenticated;
