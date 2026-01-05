-- Add multimedia support to flashcards question_type
-- Migration to extend question_type CHECK constraint for audio and image support

-- First, drop the existing constraint
ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS flashcards_question_type_check;

-- Add the updated constraint with multimedia types
ALTER TABLE flashcards 
ADD CONSTRAINT flashcards_question_type_check 
CHECK (question_type IN ('simple', 'multiple_choice', 'scenario_based', 'multi_part', 'audio_spelling', 'image'));

-- Add index for question_type to improve filtering performance
CREATE INDEX IF NOT EXISTS idx_flashcards_question_type ON flashcards(question_type);

-- Add audio_url and image_url columns for direct media references
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add indexes for media URL columns
CREATE INDEX IF NOT EXISTS idx_flashcards_audio_url ON flashcards(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flashcards_image_url ON flashcards(image_url) WHERE image_url IS NOT NULL;
