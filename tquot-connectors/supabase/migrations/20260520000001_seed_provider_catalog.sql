-- ─────────────────────────────────────────────────────────────
-- Seed: catálogo inicial de proveedores
-- supabase/migrations/20260520000001_seed_provider_catalog.sql
-- ─────────────────────────────────────────────────────────────
--
-- Esta migración rellena provider_catalog con los 19 proveedores
-- planificados. Solo 2 están marcados como is_implemented = true
-- (Hotelbeds hoteles y Duffel). El resto son stubs pendientes de implementar.
-- ─────────────────────────────────────────────────────────────

-- ─── Hoteles (bedbanks) ───

insert into provider_catalog (id, name, category, auth_type, description, docs_url, website_url, config_schema, is_implemented, is_available) values
('hotelbeds', 'Hotelbeds', 'hotels', 'api_key_secret',
 'Bedbank B2B líder en España. Inventario de hoteles con tarifas netas.',
 'https://developer.hotelbeds.com/documentation/hotels/',
 'https://www.hotelbeds.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true},
    {"key": "secret", "label": "Secret", "type": "password", "required": true},
    {"key": "environment", "label": "Entorno", "type": "select", "options": ["test", "production"], "default": "test"}
  ]}'::jsonb,
 true, true),

('hotelbeds-activities', 'Hotelbeds Activities', 'activities', 'api_key_secret',
 'Actividades y excursiones Hotelbeds (misma API key que hoteles).',
 'https://developer.hotelbeds.com/documentation/hotels/',
 'https://www.hotelbeds.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true},
    {"key": "secret", "label": "Secret", "type": "password", "required": true},
    {"key": "environment", "label": "Entorno", "type": "select", "options": ["test", "production"], "default": "test"}
  ]}'::jsonb,
 false, true),

('hotelbeds-transfers', 'Hotelbeds Transfers', 'transfers', 'api_key_secret',
 'Transfers Hotelbeds (misma API key que hoteles).',
 'https://developer.hotelbeds.com/documentation/hotels/',
 'https://www.hotelbeds.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true},
    {"key": "secret", "label": "Secret", "type": "password", "required": true},
    {"key": "environment", "label": "Entorno", "type": "select", "options": ["test", "production"], "default": "test"}
  ]}'::jsonb,
 false, true),

('ratehawk', 'RateHawk', 'hotels', 'api_key_secret',
 'Bedbank B2B con amplia cobertura internacional. Plataforma Emerging Travel Group.',
 'https://docs.ratehawk.com/',
 'https://www.ratehawk.com/',
 '{"fields": [
    {"key": "key_id", "label": "Key ID", "type": "text", "required": true},
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('w2m', 'W2M (World 2 Meet)', 'hotels', 'api_key_secret',
 'Bedbank del grupo Iberostar. Inventario fuerte en Mediterráneo y Caribe.',
 null,
 'https://www.w2m.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true},
    {"key": "client_id", "label": "Client ID", "type": "text", "required": true}
  ]}'::jsonb,
 false, true),

('goglobal', 'GoGlobal', 'hotels', 'api_key',
 'Bedbank B2B con presencia global. Conocido por buenas tarifas en Europa.',
 null,
 'https://www.goglobal.travel/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true},
    {"key": "agency_code", "label": "Código de Agencia", "type": "text", "required": true}
  ]}'::jsonb,
 false, true),

('hotelspoint', 'HotelsPoint', 'hotels', 'api_key',
 'Bedbank europeo con foco en hoteles independientes.',
 null,
 'https://www.hotelspoint.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('travelmaster', 'Travelmaster', 'hotels', 'basic_auth',
 'Plataforma B2B usada por agencias pequeñas españolas.',
 null,
 'https://www.travelmaster.es/',
 '{"fields": [
    {"key": "username", "label": "Usuario", "type": "text", "required": true},
    {"key": "password", "label": "Contraseña", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('6tours', '6Tours', 'hotels', 'api_key',
 'Bedbank con inventario en destinos vacacionales.',
 null,
 'https://www.6tours.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('smytravel-hotels', 'Smytravel Hoteles', 'hotels', 'api_key',
 'Smytravel — inventario de hoteles.',
 null,
 null,
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('smytravel-flights', 'Smytravel Vuelos', 'flights', 'api_key',
 'Smytravel — vuelos.',
 null,
 null,
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('smytravel-packages', 'Smytravel Paquetes', 'packages', 'api_key',
 'Smytravel — paquetes vacacionales.',
 null,
 null,
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('traveltool-hotels', 'TravelTool Hoteles', 'hotels', 'api_key',
 'TravelTool — inventario de hoteles.',
 null,
 null,
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('traveltool-packages', 'TravelTool Paquetes', 'packages', 'api_key',
 'TravelTool — paquetes vacacionales.',
 null,
 null,
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

-- ─── Vuelos ───

('duffel', 'Duffel', 'flights', 'oauth_bearer',
 'API moderna de vuelos. NDC + GDS. Solo modo búsqueda en TQuot (nunca reserva).',
 'https://duffel.com/docs/api/v2/overview',
 'https://duffel.com/',
 '{"fields": [
    {"key": "access_token", "label": "Access Token", "type": "password", "required": true},
    {"key": "environment", "label": "Entorno", "type": "select", "options": ["test", "production"], "default": "test"}
  ]}'::jsonb,
 true, true),

('amadeus', 'Amadeus', 'flights', 'oauth_bearer',
 'GDS clásico. API Self-Service para empezar. Solo modo búsqueda en TQuot.',
 'https://developers.amadeus.com/self-service',
 'https://amadeus.com/',
 '{"fields": [
    {"key": "client_id", "label": "Client ID", "type": "text", "required": true},
    {"key": "client_secret", "label": "Client Secret", "type": "password", "required": true},
    {"key": "environment", "label": "Entorno", "type": "select", "options": ["test", "production"], "default": "test"}
  ]}'::jsonb,
 false, true),

-- ─── Actividades ───

('civitatis', 'Civitatis', 'activities', 'api_key',
 'Excursiones y actividades en español. Fuerte en destinos hispanohablantes.',
 null,
 'https://www.civitatis.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true}
  ]}'::jsonb,
 false, true),

('getyourguide', 'GetYourGuide', 'activities', 'api_key',
 'Catálogo global de experiencias y tours. API Partner.',
 'https://partner.getyourguide.com/api',
 'https://www.getyourguide.com/',
 '{"fields": [
    {"key": "api_key", "label": "API Key", "type": "password", "required": true},
    {"key": "partner_id", "label": "Partner ID", "type": "text", "required": true}
  ]}'::jsonb,
 false, true);

-- ─────────────────────────────────────────────────────────────
-- Notas sobre la lista
-- ─────────────────────────────────────────────────────────────
--
-- 1. Cuando un proveedor se implementa de verdad (más allá del stub),
--    cambiar is_implemented = true.
--
-- 2. Si un proveedor desaparece o lo despreciamos, marcar is_available = false
--    en vez de borrarlo (para no romper agency_connections existentes).
--
-- 3. Para añadir un nuevo proveedor:
--    - INSERT en provider_catalog con is_implemented = false
--    - Crear adapters/[provider-id].ts copiando el patrón de Hotelbeds o Duffel
--    - Implementar los métodos del adapter
--    - UPDATE is_implemented = true cuando esté listo
--
-- 4. docs_url puede ser null para proveedores B2B sin documentación pública.
--    En esos casos, el alta requiere contacto comercial directo.
