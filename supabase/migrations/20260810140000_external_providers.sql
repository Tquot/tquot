-- External verified providers: shared cache + agent report loop

CREATE TABLE IF NOT EXISTS external_provider_cache (
  cache_key      TEXT PRIMARY KEY,
  category       TEXT NOT NULL,
  destination    TEXT NOT NULL,
  payload        JSONB NOT NULL,
  provider_count INT NOT NULL DEFAULT 0,
  tokens_in      INT NOT NULL DEFAULT 0,
  tokens_out     INT NOT NULL DEFAULT 0,
  searches       INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS external_provider_cache_expiry
  ON external_provider_cache (expires_at);
CREATE INDEX IF NOT EXISTS external_provider_cache_dest
  ON external_provider_cache (destination, category);

-- Caché global entre agencias: el receptivo accesible de Roma es el mismo
-- para todas. Sin RLS de agencia, pero solo lectura para usuarios.
ALTER TABLE external_provider_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read provider cache"
  ON external_provider_cache FOR SELECT TO authenticated USING (true);

-- Señalizaciones del agente: si marca un dato como incorrecto, se invalida
CREATE TABLE IF NOT EXISTS external_provider_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  cache_key    TEXT NOT NULL,
  provider_id  TEXT NOT NULL,
  field        TEXT NOT NULL CHECK (field IN ('name', 'website', 'email', 'phone', 'whole')),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_provider_reports_key
  ON external_provider_reports (cache_key);

ALTER TABLE external_provider_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members report providers"
  ON external_provider_reports FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

-- Al recibir 2 reportes del mismo cache_key, se caduca la entrada
CREATE OR REPLACE FUNCTION expire_reported_provider_cache()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM external_provider_reports WHERE cache_key = NEW.cache_key) >= 2 THEN
    UPDATE external_provider_cache SET expires_at = now() WHERE cache_key = NEW.cache_key;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER external_provider_reports_expire
  AFTER INSERT ON external_provider_reports
  FOR EACH ROW EXECUTE FUNCTION expire_reported_provider_cache();

-- Purge expired cache rows manually if needed (pg_cron may be unavailable):
--   DELETE FROM external_provider_cache WHERE expires_at < now() - interval '7 days';
-- Optional schedule when pg_cron is available:
--   SELECT cron.schedule(
--     'purge-external-provider-cache', '30 3 * * *',
--     $$DELETE FROM external_provider_cache WHERE expires_at < now() - interval '7 days';$$
--   );
