-- Bloque E: quote_shares + RPC de incremento de vistas

CREATE TABLE IF NOT EXISTS public.quote_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  view_count int NOT NULL DEFAULT 0,
  last_viewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_quote_shares_token
  ON public.quote_shares (token) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quote_shares_quote
  ON public.quote_shares (quote_id);

ALTER TABLE public.quote_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qs_select_owner ON public.quote_shares;
CREATE POLICY qs_select_owner ON public.quote_shares
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE agency_id IN (
        SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS qs_insert_owner ON public.quote_shares;
CREATE POLICY qs_insert_owner ON public.quote_shares
  FOR INSERT WITH CHECK (
    quote_id IN (
      SELECT id FROM public.quotes WHERE agency_id IN (
        SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS qs_update_owner ON public.quote_shares;
CREATE POLICY qs_update_owner ON public.quote_shares
  FOR UPDATE USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE agency_id IN (
        SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.increment_share_view(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE token = p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_share_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO authenticated;
