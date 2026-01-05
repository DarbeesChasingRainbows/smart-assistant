-- Migration: 006_SharingAndVersioning
-- Adds support for deck sharing, flashcard version history, and tagging

-- Add share_token column to decks table
ALTER TABLE decks ADD COLUMN IF NOT EXISTS share_token VARCHAR(20) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_decks_share_token ON decks(share_token) WHERE share_token IS NOT NULL;

-- Flashcard version history table
CREATE TABLE IF NOT EXISTS flashcard_versions (
    id UUID PRIMARY KEY,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    edit_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(flashcard_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_versions_flashcard_id ON flashcard_versions(flashcard_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7), -- Hex color code like #FF5733
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Flashcard-Tag junction table
CREATE TABLE IF NOT EXISTS flashcard_tags (
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    tagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (flashcard_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_tags_tag_id ON flashcard_tags(tag_id);
