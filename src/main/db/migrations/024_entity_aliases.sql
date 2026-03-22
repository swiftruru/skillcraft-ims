CREATE TABLE IF NOT EXISTS entity_aliases (
  alias       TEXT    NOT NULL,
  entity_type TEXT    NOT NULL, -- 'product' | 'customer' | 'supplier'
  entity_id   INTEGER NOT NULL,
  entity_name TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_aliases
  ON entity_aliases(alias, entity_type);
