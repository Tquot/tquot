-- Persistencia de sugerencias descartadas del agente conversacional.
-- Vive en quotes.metadata (no en snapshot del canvas).

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.quotes.metadata IS
  'Metadatos de cotización (p.ej. dismissed_suggestions del agente).';

CREATE OR REPLACE FUNCTION public.append_dismissed_suggestion(
  p_quote_id uuid,
  p_suggestion_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.quotes
  SET metadata = jsonb_set(
    coalesce(metadata, '{}'::jsonb),
    '{dismissed_suggestions}',
    coalesce(metadata->'dismissed_suggestions', '[]'::jsonb)
      || to_jsonb(p_suggestion_id),
    true
  )
  WHERE id = p_quote_id;
$$;

GRANT EXECUTE ON FUNCTION public.append_dismissed_suggestion(uuid, text) TO authenticated;
