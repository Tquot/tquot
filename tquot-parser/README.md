# TQuot — Parser inteligente de solicitudes de viaje

Parser que convierte texto libre (emails, WhatsApp, notas del agente) en datos estructurados `TripRequest` listos para alimentar las APIs de vuelos y hoteles.

Diseñado para Next.js 15 (App Router) + TypeScript + Claude API con Structured Outputs.

---

## Instalación

```bash
pnpm install
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY
```

## Smoke test sin levantar Next

```bash
pnpm test:parser
# o con input propio:
pnpm test:parser "Necesitamos viajar a Tokio 10 dias en octubre, somos 3 adultos"
```

## Arrancar dev server

```bash
pnpm dev
```

Endpoints disponibles:

- `POST /api/parser/parse` — turno 1, extracción inicial desde texto libre
- `POST /api/parser/answer` — turno N, fusión de respuestas del agente
- `GET /api/parser/session/[id]` — estado actual de la sesión
- `DELETE /api/parser/session/[id]` — borrar sesión

### Ejemplo de uso

```bash
# Turno 1
curl -X POST http://localhost:3000/api/parser/parse \
  -H "Content-Type: application/json" \
  -d '{"text":"Quiero ir a Italia en verano con mi marido en silla de ruedas. Presupuesto 3500€"}'

# Respuesta esperada: { "sessionId": "...", "status": "needs_input", "questions": [...], "partialData": {...} }

# Turno 2
curl -X POST http://localhost:3000/api/parser/answer \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"...","answers":{"destination":"Roma","dates.departureDate":"15-22 julio"}}'
```

---

## Estructura del proyecto

```
lib/parser/
├── schema.ts              ← Zod schemas (TripRequest, Questions)
├── prompts.ts             ← Prompts versionados
├── anthropic-client.ts    ← Wrapper de structured outputs + retries
├── engine.ts              ← Orquestador (extract / askQuestions / merge)
└── session.ts             ← Persistencia (in-memory por defecto, stub Redis)

app/api/parser/
├── parse/route.ts         ← POST /api/parser/parse
├── answer/route.ts        ← POST /api/parser/answer
└── session/[id]/route.ts  ← GET, DELETE
```

---

## Pendientes antes de producción

Estas decisiones se dejaron explícitas para que las cierres con tu equipo. Cada `// TODO:` en el código está alineado con esta lista.

1. **Backend de sesiones**. El default es in-memory: válido para dev, inválido para producción multi-instancia. Implementar `RedisSessionStore` en `lib/parser/session.ts` con `ioredis` o `@upstash/redis`.

2. **Anonimización pre-Claude**. El texto del cliente puede contener NIF, emails, teléfonos, condiciones médicas. Decidir entre: (a) regex de anonimización antes de mandar a la API, o (b) usar el endpoint ZDR de Anthropic. Política de conservación: máximo 30 días.

3. **Autenticación de endpoints**. Los route handlers no validan ahora mismo quién llama. Añadir middleware con el sistema de auth que use TQuot (NextAuth, Clerk, etc.) y validar que `agentId` corresponde al usuario autenticado.

4. **Rate limiting**. Por agente y por sesión. Recomendado: máximo 60 llamadas a `/parse` por hora por agente.

5. **Tipos del SDK de Anthropic**. En `lib/parser/anthropic-client.ts` hay un `(anthropic.messages.create as any)` para `output_config`. Cuando los tipos del SDK incluyan structured outputs en estable, quitar el cast.

6. **Evals**. Crear `eval/golden-dataset.json` con 50 inputs reales etiquetados. Correr regresión con cada cambio de `PROMPT_VERSION`. Métricas: precisión por campo, ratio `ready` en turno 1, ratio de assumptions corregidas por el agente.

---

## Reglas de dominio que el parser respeta

- **Accesibilidad**: cualquier mención (silla de ruedas, movilidad reducida, perro de asistencia, etc.) activa `accessibility.hasNeeds=true`. Las solicitudes con accesibilidad deben pasar revisión humana antes de cerrar la cotización.

- **Terminología**: el parser usa "personas con discapacidad" en cualquier texto generado, no "diversidad funcional" ni "personas adaptadas". Las preguntas al agente respetan esto.

- **Distinción cliente / agente**: las hipótesis del agente se marcan como tal en `specialRequests`, separadas de las peticiones explícitas del cliente.

---

## Notas para integrar con el resto de TQuot

El output `TripRequest` está diseñado para alimentar directamente:

- Buscadores de vuelos (`origin.iataCode`, `destination.iataCode`, `dates`, `passengers`, `flightPreferences`)
- Buscadores de hoteles (`destination`, `dates`, `hotelCategory`, `hotelPreferences`, `passengers`)
- Filtros de accesibilidad sobre catálogos propios (`accessibility` mapea 1:1 a los criterios de TUR4all si dispones de ese dataset)

Cuando `origin.iataCode` o `destination.iataCode` sean `null` por ambigüedad, el motor de búsqueda debe resolverlo (multi-aeropuerto) o devolver el control al agente.
