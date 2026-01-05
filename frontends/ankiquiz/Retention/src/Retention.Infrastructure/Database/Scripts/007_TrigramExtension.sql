-- Migration: 007_TrigramExtension
-- Enables pg_trgm extension for fuzzy text matching (duplicate detection)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on flashcard questions for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_flashcards_question_trgm ON flashcards USING gin (question gin_trgm_ops);
