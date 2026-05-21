# TQuot — Sistema de múltiples aeropuertos por ciudad

Cuando el agente escribe "Londres", el sistema ofrece LHR, LGW, STN. Cuando escribe "Nueva York", ofrece JFK, EWR, LGA. Para cualquier ciudad del mundo con varios aeropuertos.

---

## ⚠️ ANTES DE EMPEZAR — leer obligatoriamente

Sonnet, hablo contigo. En la conversación anterior establecimos que **no se debe tocar nada relacionado con aeropuertos, parser o PDF hasta que las APIs de Skyscanner y Booking devuelvan datos reales en producción**.

Si el endpoint `/api/_debug/skyscanner` todavía no muestra `flightsSource: "real"`, **para aquí**. Este módulo se queda en espera. Añadir esto encima de un sistema con mock silencioso va a complicar el diagnóstico.

Si Skyscanner y Booking ya devuelven datos reales verificables, sigue.

---

## Estructura de archivos a crear

```
lib/airports/
├── types.ts
├── city-groups.ts
├── data.ts
├── index.ts
└── search.ts

lib/parser/
└── airport-resolution.ts

lib/flights/
└── build-search-params.ts

components/
└── AirportPicker.tsx
```

---

## Instrucciones de integración

**Reglas para esta serie de pasos:**

1. Un commit por paso. No combinar.
2. Después del paso 7, no avanzar sin verificar los cuatro resultados.
3. En los pasos 11, 12 y 13 (los que tocan código existente), pedir el diff antes del commit.
4. Si en cualquier paso algo va mal, no avanzar. Pegar el error al usuario.
5. Si el endpoint de diagnóstico del paso 7 no funciona, **no tocar el parser**. El problema es del dataset o del mapeo en `data.ts`.

---

### Paso 1 — Verificar `lib/airports.ts` existente

Antes de tocar nada, abre `lib/airports.ts` y verifica exactamente cómo se exporta el array de aeropuertos:
- Nombre de la variable exportada
- Estructura de cada objeto (especialmente los nombres de campo: `iata`, `city`, `countryCode`)

Si la estructura no coincide con la del archivo `lib/airports/types.ts` adjunto, hay que adaptar **solo** `lib/airports/data.ts`. No tocar `lib/airports.ts` original ni el resto del módulo.

Reporta el resultado al usuario antes de continuar.

### Paso 2 — Crear `lib/airports/types.ts`

Copia el archivo del zip. Commit: `feat(airports): tipos base`.

### Paso 3 — Crear `lib/airports/city-groups.ts`

Copia el archivo del zip. Commit: `feat(airports): diccionario de ciudades multi-aeropuerto`.

### Paso 4 — Crear `lib/airports/data.ts`

Copia el archivo del zip. Si en el paso 1 la estructura era distinta (nombres de campo diferentes, no exporta `airports`, etc.), adapta este archivo para hacer el mapeo correcto antes del commit. Sin tocar otros archivos.

Commit: `feat(airports): adaptador del dataset OpenFlights`.

### Paso 5 — Crear `lib/airports/index.ts`

Copia el archivo del zip. Commit: `feat(airports): construcción de índices en memoria`.

### Paso 6 — Crear `lib/airports/search.ts`

Copia el archivo del zip. Commit: `feat(airports): API pública de resolución`.

### Paso 7 — Smoke test antes de integrar nada

Crea un endpoint de debug temporal en `app/api/_debug/airports/route.ts`:

```typescript
import { resolveCity } from "@/lib/airports/search";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "Londres";
  return Response.json({
    query: q,
    result: resolveCity(q),
  });
}
```

Commit: `feat(airports): endpoint de diagnóstico`.

Despliega y pide al usuario que abra estas cuatro URLs y pegue los resultados:

- `/api/_debug/airports?q=Londres` → debe devolver LHR, LGW, STN, LTN, LCY, SEN
- `/api/_debug/airports?q=Nueva%20York` → debe devolver JFK, EWR, LGA
- `/api/_debug/airports?q=MAD` → debe devolver Madrid Barajas (no multi-airport)
- `/api/_debug/airports?q=Bilbao` → debe devolver BIO (no multi-airport)

Si los cuatro están bien, sigue. Si alguno falla, parar y diagnosticar.

### Paso 8 — Crear `lib/parser/airport-resolution.ts`

Copia el archivo del zip. Commit: `feat(parser): enriquecimiento con aeropuertos`.

### Paso 9 — Crear `components/AirportPicker.tsx`

Copia el archivo del zip. Commit: `feat(ui): componente AirportPicker`.

### Paso 10 — Crear `lib/flights/build-search-params.ts`

Copia el archivo del zip. Commit: `feat(flights): builder de parámetros de búsqueda`.

### Paso 11 — Integrar en el flujo del parser

En el lugar donde se llama al parser y se recibe `TripRequest` (probablemente en `app/actions/` o donde haga la llamada al engine), añadir DESPUÉS de recibir el `TripRequest`:

```typescript
import { enrichWithAirports } from "@/lib/parser/airport-resolution";
// ...
const enriched = enrichWithAirports(tripRequest);
```

Pasar `enriched` al siguiente paso del flujo en lugar de `tripRequest`. No tocar nada más.

**Antes del commit**: mostrar al usuario exactamente qué línea se ha añadido y dónde, para que la revise.

Commit: `feat(parser): integrar resolución de aeropuertos en flujo principal`.

### Paso 12 — Integrar `AirportPicker` en la UI

En la página donde se muestra el resultado del parser antes de buscar vuelos, añadir el componente `AirportPicker` para origen y destino. Solo cuando `enriched._resolved.origin.needsAgentChoice` o `enriched._resolved.destination.needsAgentChoice` sean `true`.

El botón "Buscar vuelos" debe estar deshabilitado hasta que el agente haya elegido (o seleccionado "todos").

**Antes del commit**: mostrar al usuario el código completo del cambio.

Commit: `feat(ui): selector de aeropuertos antes de buscar`.

### Paso 13 — Conectar `build-search-params` con el cliente de Skyscanner

En la función que llama a Skyscanner, sustituir los parámetros que se construían manualmente por el resultado de `buildFlightSearchParams(enriched, choices)`.

Si Skyscanner solo acepta un origen y un destino, usar `origins[0]` y `destinations[0]` por ahora (TODO: optimizar luego para que haga búsquedas en paralelo si `origins.length > 1`).

**Antes del commit**: mostrar al usuario el diff completo.

Commit: `feat(flights): usar selección de aeropuertos en búsqueda real`.

### Paso 14 — Limpiar endpoint de diagnóstico (opcional)

Cuando todo funcione estable durante al menos 1-2 semanas, borrar `app/api/_debug/airports/route.ts`. Hasta entonces, dejarlo por si hace falta diagnosticar algo.

Commit (cuando se haga): `chore: limpiar debug endpoint de aeropuertos`.

---

## Si algo falla

- **El endpoint de debug del paso 7 devuelve `null` para Londres**: el problema está en `data.ts` (no se está leyendo bien `lib/airports.ts`) o en `index.ts` (los IATAs del diccionario no se encuentran en el dataset). Mira los warnings en logs de Vercel: `[airports] IATA XXX en city-groups no encontrado en OpenFlights`.

- **El endpoint funciona pero el parser no resuelve**: el problema está en `airport-resolution.ts` o en cómo se llama desde el flujo del parser. Verificar que `enriched._resolved` se está rellenando.

- **El picker no aparece en la UI**: verificar que `needsAgentChoice` está llegando como `true` cuando corresponde. Es habitual que el parser ya devuelva `iataCode` y se salte la elección.

- **Skyscanner sigue devolviendo mock después del paso 13**: el problema NO es este módulo. Es la integración real de Skyscanner. Volver al endpoint `/api/_debug/skyscanner` y diagnosticar allí.
