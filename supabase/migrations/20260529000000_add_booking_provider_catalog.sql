-- Booking.com via RapidAPI — connector for hotel search / comparator.

INSERT INTO provider_catalog (
  id,
  name,
  category,
  auth_type,
  description,
  docs_url,
  website_url,
  config_schema,
  is_implemented,
  is_available
) VALUES (
  'booking',
  'Booking.com',
  'hotels',
  'api_key',
  'Búsqueda de hoteles vía RapidAPI (Booking.com).',
  'https://rapidapi.com/apidojo/api/booking-com18',
  'https://www.booking.com/',
  '{"fields": [
    {"key": "rapidapi_key", "label": "RapidAPI Key", "type": "password", "required": true}
  ]}'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  auth_type = EXCLUDED.auth_type,
  description = EXCLUDED.description,
  docs_url = EXCLUDED.docs_url,
  website_url = EXCLUDED.website_url,
  config_schema = EXCLUDED.config_schema,
  is_implemented = EXCLUDED.is_implemented,
  is_available = EXCLUDED.is_available;
