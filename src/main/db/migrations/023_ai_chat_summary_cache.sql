ALTER TABLE ai_chat_sessions ADD COLUMN summary_cache TEXT;
ALTER TABLE ai_chat_sessions ADD COLUMN summary_at   INTEGER DEFAULT 0;
