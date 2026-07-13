-- Bloque E: estados de cotización + audit log

DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM (
    'draft', 'sent', 'accepted', 'reserved', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS status public.quote_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE TABLE IF NOT EXISTS public.quote_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  from_status public.quote_status,
  to_status public.quote_status NOT NULL,
  note text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users (id)
);

CREATE INDEX IF NOT EXISTS idx_quote_status_audit
  ON public.quote_status_audit (quote_id, changed_at DESC);

ALTER TABLE public.quote_status_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qsa_select ON public.quote_status_audit;
CREATE POLICY qsa_select ON public.quote_status_audit
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE agency_id IN (
        SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS qsa_insert ON public.quote_status_audit;
CREATE POLICY qsa_insert ON public.quote_status_audit
  FOR INSERT WITH CHECK (
    quote_id IN (
      SELECT id FROM public.quotes WHERE agency_id IN (
        SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
      )
    )
  );
