CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL DEFAULT '新對話',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
  content    TEXT    NOT NULL,
  context    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
