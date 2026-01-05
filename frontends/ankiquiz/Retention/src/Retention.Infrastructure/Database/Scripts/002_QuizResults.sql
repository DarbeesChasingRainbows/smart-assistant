-- Quiz results table for per-question metrics
CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    deck_id UUID NOT NULL,
    flashcard_id UUID NOT NULL,
    is_correct BOOLEAN NOT NULL,
    difficulty TEXT NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    raw_answer TEXT,
    CONSTRAINT fk_quiz_results_deck FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_results_flashcard FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_deck_id ON quiz_results(deck_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_flashcard_id ON quiz_results(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_answered_at ON quiz_results(answered_at);
