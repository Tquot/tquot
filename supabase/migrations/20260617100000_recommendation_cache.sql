CREATE TABLE IF NOT EXISTS recommendation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  destination_normalized text NOT NULL,
  trip_context_hash text,
  providers jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (category, destination_normalized)
);

CREATE INDEX idx_recommendation_cache_lookup
  ON recommendation_cache (category, destination_normalized);

CREATE INDEX idx_recommendation_cache_expires
  ON recommendation_cache (expires_at);

ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY rec_cache_read_all ON recommendation_cache
  FOR SELECT USING (true);
