CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size BIGINT NOT NULL,
    associated_entity_id UUID,
    associated_entity_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON media_assets(associated_entity_id);
