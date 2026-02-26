ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US';
ALTER TABLE transcript_chunks ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US';
CREATE INDEX IF NOT EXISTS idx_sessions_language ON sessions(language);