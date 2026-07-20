-- Bloque C: branding por agencia para PDF premium

CREATE TABLE IF NOT EXISTS public.agency_branding (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies (id) ON DELETE CASCADE,
  primary_color text NOT NULL DEFAULT '#1e40af',
  secondary_color text NOT NULL DEFAULT '#0ea5e9',
  text_color text NOT NULL DEFAULT '#0f172a',
  accent_color text NOT NULL DEFAULT '#f59e0b',
  logo_url text,
  font_family text NOT NULL DEFAULT 'Helvetica',
  cover_image_url text,
  agency_legal_name text,
  agency_phone text,
  agency_email text,
  agency_website text,
  agency_address text,
  pdf_footer_text text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY ab_select ON public.agency_branding
  FOR SELECT USING (
    agency_id IN (
      SELECT am.agency_id FROM public.agency_members am
      WHERE am.user_id = auth.uid()
    )
  );

CREATE POLICY ab_modify ON public.agency_branding
  FOR ALL USING (
    agency_id IN (
      SELECT am.agency_id FROM public.agency_members am
      WHERE am.user_id = auth.uid() AND am.role = 'owner'
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM public.agency_members am
      WHERE am.user_id = auth.uid() AND am.role = 'owner'
    )
  );

DROP TRIGGER IF EXISTS agency_branding_set_updated_at ON public.agency_branding;
CREATE TRIGGER agency_branding_set_updated_at
  BEFORE UPDATE ON public.agency_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
