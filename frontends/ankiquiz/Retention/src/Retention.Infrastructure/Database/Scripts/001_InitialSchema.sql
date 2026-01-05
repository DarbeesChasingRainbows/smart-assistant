-- Core Tables
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS glossary_terms (
    id UUID PRIMARY KEY,
    term VARCHAR(255) NOT NULL UNIQUE,
    pronunciation VARCHAR(255),
    definition TEXT NOT NULL,
    etymology TEXT,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'simple' CHECK (question_type IN ('simple', 'multiple_choice', 'scenario_based', 'multi_part')),
    metadata JSONB,
    next_review_date TIMESTAMPTZ NOT NULL,
    interval_days INTEGER NOT NULL DEFAULT 1,
    repetitions INTEGER NOT NULL DEFAULT 0,
    ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-Reference System
CREATE TABLE IF NOT EXISTS cross_references (
    id UUID PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('flashcard', 'deck', 'glossary_term')),
    source_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('flashcard', 'deck', 'glossary_term')),
    target_id UUID NOT NULL,
    reference_type VARCHAR(50) DEFAULT 'related' CHECK (reference_type IN ('related', 'prerequisite', 'follows_from', 'contradicts', 'example_of')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_type, source_id, target_type, target_id, reference_type)
);

-- Glossary-Card Relationships
CREATE TABLE IF NOT EXISTS flashcard_glossary_terms (
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    glossary_term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (flashcard_id, glossary_term_id)
);

-- Quiz Sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY,
    user_id UUID,
    session_type VARCHAR(50) DEFAULT 'review',
    difficulty_level VARCHAR(20),
    total_cards INTEGER NOT NULL,
    completed_cards INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    session_data JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_session_cards (
    id UUID PRIMARY KEY,
    quiz_session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id),
    position INTEGER NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN,
    response_time_ms INTEGER,
    difficulty_rating VARCHAR(10) CHECK (difficulty_rating IN ('again', 'hard', 'good', 'easy')),
    answered_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review_date ON flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_cross_references_source ON cross_references(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_cross_references_target ON cross_references(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_glossary_terms_term ON glossary_terms(term);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_started_at ON quiz_sessions(started_at);
