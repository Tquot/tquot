-- Bloque E: quote_versions + snapshot jsonb en quotes
-- Cada refinamiento / edición guarda la versión previa del snapshot.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS snapshot jsonb;

COMMENT ON COLUMN public.quotes.snapshot IS
  'Snapshot completo del Quote en memoria (canvas). Usado por versionado y share público.';

CREATE TABLE IF NOT EXISTS public.quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  version_number int NOT NULL,
  snapshot jsonb NOT NULL,
  change_summary text,
  change_kind text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id),
  UNIQUE (quote_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quote_versions_quote
  ON public.quote_versions (quote_id, version_number DESC);

ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qv_select ON public.quote_versions;
CREATE POLICY qv_select ON public.quote_versions
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE agency_id IN (
        SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS qv_insert ON public.quote_versions;
CREATE POLICY qv_insert ON public.quote_versions
  FOR INSERT WITH CHECK (true);
