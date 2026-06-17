CREATE TABLE IF NOT EXISTS agency_booking_config (
  agency_id uuid PRIMARY KEY REFERENCES agencies(id) ON DELETE CASCADE,
  hotelbeds_extranet_url text NOT NULL DEFAULT 'https://app.hotelbeds.com',
  preferred_airline_sites jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_hotel_booking_site text,
  default_locale text NOT NULL DEFAULT 'es-ES',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agency_booking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY abc_select ON agency_booking_config
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY abc_insert ON agency_booking_config
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY abc_update ON agency_booking_config
  FOR UPDATE USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
