ALTER TABLE ai_chat_messages ADD COLUMN faithfulness_score INTEGER;
ALTER TABLE ai_chat_messages ADD COLUMN model_used TEXT;
ALTER TABLE ai_chat_messages ADD COLUMN input_tokens INTEGER;
ALTER TABLE ai_chat_messages ADD COLUMN output_tokens INTEGER;
ALTER TABLE ai_chat_messages ADD COLUMN sources TEXT;
