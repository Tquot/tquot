# TQuot — Sistema de connectors B2B

Cada agencia conecta sus propios proveedores (Hotelbeds, RateHawk, Duffel, etc.) con sus propias credenciales. TQuot orquesta las búsquedas y ofrece un **comparador pre-reserva** que consulta todos los proveedores conectados en paralelo y muestra ranking de precios.

Validado con entrevista real a agente: 20-25 minutos por reserva buscando manualmente en 7 sistemas B2B distintos. Este módulo lo reduce a segundos.

---

## ⚠️ AVISO IMPORTANTE — leer antes de implementar

Este módulo **NO es la siguiente pieza** del roadmap de TQuot. Va después de:

1. Toggle modo demo (en curso)
2. Márgenes configurables
3. Inventario propio + Excel
4. Jerarquía INV-PROPIO → WEB

**Solo implementar este sistema cuando las cuatro piezas anteriores estén funcionando en producción y se hayan generado al menos 20-30 cotizaciones reales.**

Razón: este módulo asume que `buildQuote` ya respeta la jerarquía de fuentes, que el inventario propio existe, y que el sistema de cotización es estable. Implementarlo antes es construir el final del flujo sin tener el principio.

---

## Qué incluye este ZIP

**Funcional y listo para integrar (con TODOs marcados):**

- ✅ Esquema SQL completo (tablas, encriptación pgcrypto, RLS, funciones)
- ✅ Tipos TypeScript completos (`lib/connectors/types/`)
- ✅ Registry de adaptadores (`lib/connectors/registry.ts`)
- ✅ Utilidades comunes (`lib/connectors/utils/`)
- ✅ **Adaptador completo de Hotelbeds** (referencia principal)
- ✅ **Adaptador funcional de Duffel** (referencia para vuelos, modo SEARCH solo)
- ✅ Lógica completa del comparador pre-reserva (`lib/comparator/`)
- ✅ Route handlers de API (`app/api/connectors/*`, `app/api/comparator`)
- ✅ UI de la página Integraciones (`app/dashboard/integrations`)
- ✅ Helpers de Supabase (`lib/connectors/storage.ts`)

**Stubs (esqueletos pendientes de implementar):**

- ⏳ RateHawk, W2M, GoGlobal, HotelsPoint, Travelmaster, 6Tours, Smytravel, TravelTool
- ⏳ Amadeus
- ⏳ Civitatis, GetYourGuide

Cada stub está en `lib/connectors/adapters/[provider].ts` con comentarios sobre cómo implementarlo cuando llegue el momento.

---

## Orden de implementación recomendado

**Fase 1: Infraestructura (semana 1)**

1. Aplicar migraciones SQL (ver sección abajo)
2. Verificar tablas en Supabase Studio
3. Integrar tipos en el proyecto principal de TQuot
4. Configurar `app.credentials_key` en la BD

**Fase 2: Hotelbeds funcional (semana 2-3)**

5. Tener credenciales reales de Hotelbeds (sandbox primero)
6. Probar `testConnection` desde un script o el endpoint debug
7. Probar `searchHotels` con datos reales
8. Sustituir AUTH_TODO en los route handlers por el auth real de TQuot
9. Probar la UI de Integraciones: conectar Hotelbeds desde una agencia real

**Fase 3: Comparador (semana 3-4)**

10. Implementar Duffel sandbox (ya está el adaptador, solo conectar credenciales)
11. Probar el comparador con 2 conexiones (Hotelbeds + uno más)
12. Integrar el botón "Comparar precios" en el flujo de cotización existente

**Fase 4: Más proveedores (mes 2 en adelante, según demanda real)**

13. Implementar RateHawk (segundo más mencionado por agencias)
14. El resto según prioricen los clientes piloto

**No implementar todos los stubs a la vez.** Cada uno requiere acceso comercial al proveedor, lectura de su documentación, y tests reales. Hacer uno por uno, copiando el patrón de Hotelbeds.

---

## Aplicar las migraciones

```bash
# 1. Configurar la clave de encriptación EN LA BD (no en .env del código).
# Conectarse a la BD de Supabase con psql o el SQL Editor:

ALTER DATABASE postgres SET app.credentials_key = 'GENERAR-CON-openssl-rand-base64-48';

# 2. Aplicar las dos migraciones en orden:
#    - 20260520000000_connectors_system.sql  (tablas + RLS + funciones)
#    - 20260520000001_seed_provider_catalog.sql  (catálogo inicial)

# Si usas Supabase CLI:
supabase migration up

# Si no, copiar el contenido de cada archivo al SQL Editor de Supabase.
```

**IMPORTANTE**: la clave de encriptación debe guardarse en un sitio seguro (1Password, Vault). Si se pierde, las credenciales guardadas no se pueden descifrar y hay que pedir a cada agencia que las reintroduzca.

---

## Estructura del módulo

```
lib/connectors/
├── types/index.ts                  ← Interfaces compartidas (ProviderAdapter, etc.)
├── utils/index.ts                  ← fetchWithTimeout, ConnectorError, tryAdapter
├── registry.ts                     ← Registro de adaptadores activos
├── storage.ts                      ← Helpers de Supabase
└── adapters/
    ├── hotelbeds.ts                ← ✅ FUNCIONAL (adaptador de referencia)
    ├── duffel.ts                   ← ✅ FUNCIONAL (referencia vuelos, SEARCH only)
    ├── ratehawk.ts                 ← ⏳ STUB
    ├── w2m.ts                      ← ⏳ STUB
    ├── goglobal.ts                 ← ⏳ STUB
    ├── hotelspoint.ts              ← ⏳ STUB
    ├── travelmaster.ts             ← ⏳ STUB
    ├── 6tours.ts                   ← ⏳ STUB
    ├── smytravel.ts                ← ⏳ STUB
    ├── traveltool.ts               ← ⏳ STUB
    ├── amadeus.ts                  ← ⏳ STUB
    ├── civitatis.ts                ← ⏳ STUB
    └── getyourguide.ts             ← ⏳ STUB

lib/comparator/
└── index.ts                        ← Lógica de comparación pre-reserva

app/api/
├── connectors/
│   ├── catalog/route.ts            ← GET catálogo de proveedores
│   ├── connections/route.ts        ← GET, POST conexiones
│   ├── connections/[id]/route.ts   ← DELETE conexión
│   └── test/route.ts               ← POST probar conexión
└── comparator/route.ts             ← POST ejecutar comparador

app/dashboard/integrations/
├── page.tsx                        ← Página principal
└── components/
    ├── IntegrationsClient.tsx      ← Vista cliente con cards
    ├── ConnectorCard.tsx           ← Card de cada proveedor
    └── ConnectorModal.tsx          ← Modal de configuración

supabase/migrations/
├── 20260520000000_connectors_system.sql
└── 20260520000001_seed_provider_catalog.sql
```

---

## TODOs marcados en el código

Buscar `AUTH_TODO` y `SUPABASE_IMPORT_TODO` en los archivos. Son las cosas que **DEBES** adaptar antes de que esto funcione:

1. **`AUTH_TODO`** en route handlers y `page.tsx`: reemplazar los stubs `getCurrentUserAndAgency` / `requireAuth` / `getAgencyId` por el sistema real de auth de TQuot (probablemente Supabase Auth con cookies).

2. **`SUPABASE_IMPORT_TODO`** en `lib/connectors/storage.ts`: si TQuot tiene un wrapper de Supabase (`@/lib/supabase/server`), sustituir el `createClient` inline por ese wrapper.

3. **Política RLS `user_agency_ids()`** en la migración: asume tabla `agency_members(user_id, agency_id)`. Si el modelo de pertenencia de TQuot es distinto, adaptar la función.

---

## REGLAS INNEGOCIABLES (NO TOCAR)

Estas son decisiones estratégicas tomadas con el fundador. No se reabren sin su luz verde explícita.

### 1. TQuot NO reserva, NUNCA

Independientemente del proveedor (Duffel, Hotelbeds, Amadeus, lo que sea), TQuot solo usa endpoints de **búsqueda**. El agente reserva desde el extranet del proveedor vía deep linking.

**Si en algún momento alguien propone añadir `createOrder()`, `booking()`, `confirmReservation()` o similar a cualquier adaptador, la respuesta es no.**

Razones legales:
- TQuot no es agencia de viajes
- No necesita licencia ni garantía financiera de 100.000€
- No asume responsabilidad solidaria con proveedores

En particular para **Duffel**: solo modo `search`. **Nunca** `orders` ni `payments`.

### 2. Las credenciales NUNCA se devuelven al cliente

`agency_connections.encrypted_credentials` está encriptado en BD. Solo se descifra:
- Para llamadas a la API del proveedor (en el servidor)
- A través de la función `get_connection_with_credentials` (con verificación de permisos)

**Nunca incluir las credenciales en ninguna respuesta JSON que vaya al navegador.**

### 3. La lista de proveedores está cerrada

`provider_catalog` la define TQuot, no las agencias. Una agencia no puede "añadir un proveedor personalizado" — tendría que pedir a TQuot que lo integre como adaptador.

Esto evita: caos en el sistema, problemas legales (proveedores no verificados), credenciales raras, comportamientos imprevistos.

---

## Cómo añadir un proveedor nuevo

Cuando llegue el momento de implementar un stub (ej: RateHawk):

1. Leer las docs oficiales del proveedor
2. Solicitar credenciales reales (sandbox primero)
3. Abrir `lib/connectors/adapters/ratehawk.ts` y reemplazar los `throw new Error` por la implementación real, **copiando el patrón de `hotelbeds.ts`**
4. En `lib/connectors/registry.ts`, descomentar la línea `registry.set("ratehawk", new RatehawkAdapter())`
5. En la BD: `UPDATE provider_catalog SET is_implemented = true WHERE id = 'ratehawk'`
6. Probar con `/api/connectors/test` desde la UI
7. Si todo OK, deploy

**Empezad por el adaptador que más agencias hayan mencionado en entrevistas.** Probablemente RateHawk según las primeras conversaciones, pero verificad con más entrevistas antes de invertir tiempo.

---

## Cuando esté listo, probar el comparador

Test manual del happy path:

1. Conectar 2 proveedores en `/dashboard/integrations` (Hotelbeds + uno cuando esté listo)
2. Cotizar un viaje normal con TQuot
3. Cliente "acepta" la cotización
4. En la pantalla de pre-reserva, botón "Comparar precios"
5. Verificar que devuelve ranking con ambos proveedores
6. Verificar que muestra errores cuando alguno falla
7. Verificar tiempo total < 10 segundos en condiciones normales

Una vez funcionando, mostrarlo a la agente entrevistada para feedback real.
