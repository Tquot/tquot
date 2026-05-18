# Instrucciones para Cursor / Claude Sonnet 4.6

Este repo se generó como esqueleto para el parser de TQuot. Está listo para ejecutar tras `pnpm install`, pero hay decisiones de integración que requieren contexto del repo real de TQuot.

## Qué NO toques

- `lib/parser/schema.ts` — el schema `TripRequest` es la API pública del módulo. Cambios aquí rompen los consumidores downstream (buscadores de vuelos/hoteles). Si necesitas añadir un campo, hazlo opcional con default seguro.
- `lib/parser/prompts.ts` — los prompts están versionados con `PROMPT_VERSION`. Si los modificas, **incrementa la versión** y deja constancia en un changelog. El equipo corre evals comparativos entre versiones.
- La separación en tres prompts (extract / questions / merge). Está intencional: cada uno cubre un modo cognitivo distinto y se evalúa por separado.

## Qué SÍ deberías hacer al integrar

1. **Auth**: añade middleware en los route handlers (`app/api/parser/*`) usando el sistema de auth de TQuot. Validar que `agentId` en el body == usuario autenticado.

2. **Session store Redis**: implementa `RedisSessionStore` en `lib/parser/session.ts`. El stub está ahí. Clave sugerida: `tquot:parser:session:${id}` con TTL 86400s. Usa `ioredis` o `@upstash/redis` según lo que ya tenga TQuot.

3. **Anonimización pre-Claude**: antes de mandar `rawInput` a Claude, pasa el texto por un anonimizador que sustituya:
   - Emails → `[EMAIL]`
   - Teléfonos (formatos ES, MX, AR) → `[TELEFONO]`
   - NIF/DNI → `[DOC]`
   - Números de tarjeta → `[TARJETA]`

   Punto de inserción: en `app/api/parser/parse/route.ts`, justo después de validar el body y antes de pasar a `engine.parse()`.

4. **Tipos del SDK**: en `lib/parser/anthropic-client.ts` hay un `as any` sobre `messages.create` porque los tipos del SDK aún no incluyen `output_config`. Cuando la versión que uses tipe la feature, quita el cast. Comprueba con `pnpm typecheck`.

5. **Integración con buscadores**: cuando `result.status === "ready"`, llama a tu orquestador de búsqueda existente con `result.data`. Si `data.accessibility.hasNeeds === true`, marca la cotización para revisión humana antes de cerrar.

## Cómo trabaja el parser (resumen para no leerlo todo)

- Turno 1: agente pega texto → `engine.parse()` → Claude extrae con Structured Outputs → si faltan campos críticos, Claude genera preguntas → devuelve `{status: "needs_input", questions, partialData}`.
- Turno N: agente responde preguntas → `engine.merge()` → Claude fusiona → si sigue incompleto, nueva ronda (máx. `PARSER_MAX_QUESTION_ROUNDS`, default 2).
- Tras 2 rondas, el endpoint fuerza `status: "ready"` con warning para que no se atrape al agente en bucle.

## Tests rápidos antes de subir cambios

```bash
pnpm typecheck                              # tipos estrictos
pnpm test:parser                            # smoke test del flujo completo
pnpm test:parser "tu input de prueba aquí"  # con input ad-hoc
```

## Si te encuentras con errores de schema demasiado complejo

Structured Outputs tiene límites de complejidad de schema. Si la API devuelve 400 con "schema too complex":
- Reduce profundidad de anidamiento (aplana objetos).
- Reduce número de enums con muchos valores.
- Divide en sub-llamadas (no es el caso aquí, el schema actual está dentro de límites).

## Cosas que el primer Claude ya pensó y descartó

- **Una sola llamada con tool use**: descartado. Dos prompts separados dan mejor precisión y permiten evals independientes.
- **Pydantic-style con validador externo**: descartado. Zod ya da runtime + tipos TS, y `z.toJSONSchema` evita duplicar.
- **Hacer las preguntas al cliente final en lugar de al agente**: descartado. TQuot es B2B para agencias; el agente media siempre.
- **Detectar fechas con regex antes de llamar a Claude**: descartado por ahora. Si los costes se disparan, considerar prefiltrado con Haiku 4.5.
