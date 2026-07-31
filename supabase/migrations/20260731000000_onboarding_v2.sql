-- Onboarding v2: progress tracking + accessibility default (Bloque G)

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS accessibility_default BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT;

CREATE TABLE IF NOT EXISTS public.agency_onboarding (
  agency_id UUID PRIMARY KEY REFERENCES public.agencies (id) ON DELETE CASCADE,
  current_step TEXT NOT NULL DEFAULT 'welcome',
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  demo_mode BOOLEAN NOT NULL DEFAULT false,
  first_quote_id UUID,
  connected_providers TEXT[] NOT NULL DEFAULT '{}',
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agency_onboarding IS
  'Progreso del onboarding v2 por agencia.';
COMMENT ON COLUMN public.agencies.accessibility_default IS
  'Si true, mostrar info de accesibilidad verificada por defecto en cotizaciones.';

ALTER TABLE public.agency_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_onboarding_owner_all ON public.agency_onboarding;
CREATE POLICY agency_onboarding_owner_all
  ON public.agency_onboarding
  FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );
