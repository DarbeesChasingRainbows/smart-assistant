-- Migration: Create users table for simple user tracking (no authentication)
-- This table tracks user progress, stats, and streaks

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_quizzes_taken INTEGER NOT NULL DEFAULT 0,
    total_cards_reviewed INTEGER NOT NULL DEFAULT 0,
    total_correct_answers INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email)) WHERE email IS NOT NULL;

-- Index for display name lookups
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(LOWER(display_name));

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_longest_streak ON users(longest_streak DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_quizzes ON users(total_quizzes_taken DESC);
CREATE INDEX IF NOT EXISTS idx_users_accuracy ON users(total_cards_reviewed DESC) WHERE total_cards_reviewed > 0;

-- Update quiz_results to reference users table (optional FK)
-- Note: We keep userId as string for backwards compatibility, but can add FK if needed
-- ALTER TABLE quiz_results ADD CONSTRAINT fk_quiz_results_user 
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON TABLE users IS 'Simple user tracking for quiz progress and stats (no authentication)';
COMMENT ON COLUMN users.display_name IS 'User display name for identification';
COMMENT ON COLUMN users.email IS 'Optional email for identification (not for auth)';
COMMENT ON COLUMN users.current_streak IS 'Current consecutive days with activity';
COMMENT ON COLUMN users.longest_streak IS 'Longest streak ever achieved';
COMMENT ON COLUMN users.last_activity_date IS 'Last date user was active (for streak calculation)';
