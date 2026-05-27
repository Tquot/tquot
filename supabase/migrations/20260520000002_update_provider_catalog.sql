-- Follow-up for databases that already applied the original connector seed.
-- Safe to run on fresh installs after updated 20260520000001 (INSERTs no-op via ON CONFLICT).

ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'packages';
ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'corporate';

INSERT INTO provider_catalog (id, name, category, auth_type, description, config_schema, is_implemented, is_available)
VALUES
('hotelbeds-activities', 'Hotelbeds Activities', 'activities', 'api_key_secret', 'Actividades y excursiones Hotelbeds.', '{"fields": [{"key": "api_key", "label": "API Key", "type": "password", "required": true}, {"key": "secret", "label": "Secret", "type": "password", "required": true}]}'::jsonb, false, true),
('hotelbeds-transfers', 'Hotelbeds Transfers', 'transfers', 'api_key_secret', 'Transfers Hotelbeds.', '{"fields": [{"key": "api_key", "label": "API Key", "type": "password", "required": true}, {"key": "secret", "label": "Secret", "type": "password", "required": true}]}'::jsonb, false, true),
('smytravel-hotels', 'Smytravel Hoteles', 'hotels', 'api_key', 'Smytravel — inventario de hoteles.', '{"fields": [{"key": "api_key", "label": "API Key", "type": "password", "required": true}]}'::jsonb, false, true),
('smytravel-flights', 'Smytravel Vuelos', 'flights', 'api_key', 'Smytravel — vuelos.', '{"fields": [{"key": "api_key", "label": "API Key", "type": "password", "required": true}]}'::jsonb, false, true),
('smytravel-packages', 'Smytravel Paquetes', 'packages', 'api_key', 'Smytravel — paquetes vacacionales.', '{"fields": [{"key": "api_key", "label": "API Key", "type": "password", "required": true}]}'::jsonb, false, true),
('traveltool-hotels', 'TravelTool Hoteles', 'hotels', 'api_key', 'TravelTool — inventario de hoteles.', '{"fields": [{"key": "api_key", "label": "API Key", "type": "password", "required": true}]}'::jsonb, false, true),
('traveltool-packages', 'TravelTool Paquetes', 'packages', 'api_key', 'TravelTool — paquetes vacacionales.', '{"fields": [{"key": "api_key", "label": "API Key", "type": "password", "required": true}]}'::jsonb, false, true)
ON CONFLICT (id) DO NOTHING;

DELETE FROM provider_catalog WHERE id IN ('smytravel', 'traveltool');
