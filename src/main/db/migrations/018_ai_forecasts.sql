CREATE TABLE IF NOT EXISTS ai_forecasts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  summary      TEXT    NOT NULL,
  items_json   TEXT    NOT NULL,
  generated_at TEXT    NOT NULL
);
