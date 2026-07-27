-- Bloque D: preferencias inferidas + stats de clientes

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS inferred_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_quotes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_quote_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_quote_at timestamptz;

COMMENT ON COLUMN public.clients.inferred_preferences IS
  'Preferencias deducidas del histórico de cotizaciones (tier, destinos, grupo, etc.).';
COMMENT ON COLUMN public.clients.total_quotes IS
  'Número de cotizaciones asociadas al cliente (mantenido por trigger).';

-- Persistimos el trip input para poder re-inferir preferencias sin depender solo del snapshot
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS parsed jsonb;

COMMENT ON COLUMN public.quotes.parsed IS
  'ParsedTripInput (v1 o v2) usado al generar/guardar la cotización.';

CREATE INDEX IF NOT EXISTS idx_clients_email_lower
  ON public.clients (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_client_id
  ON public.quotes (client_id)
  WHERE client_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_client_stats(p_client_id uuid)
RETURNS void AS $$
BEGIN
  IF p_client_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.clients
  SET
    total_quotes = (SELECT count(*)::int FROM public.quotes WHERE client_id = p_client_id),
    last_quote_at = (SELECT max(created_at) FROM public.quotes WHERE client_id = p_client_id),
    first_quote_at = COALESCE(
      first_quote_at,
      (SELECT min(created_at) FROM public.quotes WHERE client_id = p_client_id)
    )
  WHERE id = p_client_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_client_stats(OLD.client_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.client_id IS DISTINCT FROM NEW.client_id
     AND OLD.client_id IS NOT NULL THEN
    PERFORM public.refresh_client_stats(OLD.client_id);
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    PERFORM public.refresh_client_stats(NEW.client_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotes_update_client_stats ON public.quotes;
CREATE TRIGGER quotes_update_client_stats
  AFTER INSERT OR DELETE OR UPDATE OF client_id ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_client_stats();

-- Backfill stats for existing clients
UPDATE public.clients c
SET
  total_quotes = coalesce(s.cnt, 0),
  last_quote_at = s.last_at,
  first_quote_at = coalesce(c.first_quote_at, s.first_at)
FROM (
  SELECT
    client_id,
    count(*)::int AS cnt,
    max(created_at) AS last_at,
    min(created_at) AS first_at
  FROM public.quotes
  WHERE client_id IS NOT NULL
  GROUP BY client_id
) s
WHERE c.id = s.client_id;
