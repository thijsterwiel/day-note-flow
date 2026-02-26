-- Add language column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US';

-- Add language column to transcript_chunks table  
ALTER TABLE transcript_chunks ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US';

-- Add index for language queries
CREATE INDEX IF NOT EXISTS idx_sessions_language ON sessions(language);

COMMENT ON COLUMN sessions.language IS 'Language code (e.g. en-US, nl-NL) for speech recognition and AI summarization';
COMMENT ON COLUMN transcript_chunks.language IS 'Language code for this transcript chunk';
