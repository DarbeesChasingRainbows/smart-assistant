-- Seed Default Deck for legacy/uncategorized cards
INSERT INTO decks (id, name, description, category, subcategory, difficulty_level, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'Uncategorized', 
    'Default deck for cards created without a specific deck assignment', 
    'General', 
    'Misc', 
    'beginner',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
