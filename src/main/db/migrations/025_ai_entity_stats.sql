CREATE TABLE IF NOT EXISTS ai_entity_stats (
  entity_type  TEXT    NOT NULL,
  entity_id    INTEGER NOT NULL,
  query_count  INTEGER NOT NULL DEFAULT 1,
  faith_sum    INTEGER NOT NULL DEFAULT 0,
  last_queried INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (entity_type, entity_id)
);
