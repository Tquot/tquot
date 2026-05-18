# Instrucciones para Cursor / Claude Sonnet 4.6

Este módulo se generó como una pieza encajable en el proyecto TQuot existente (Next.js 15 + TypeScript + Supabase + Vercel). El proyecto ya tiene login, APIs de vuelos/hoteles y motor de cotización funcionando.

## Lo que NO debes tocar sin coordinar

- **`lib/pdf/theme.ts`** — sistema de diseño centralizado. Cambios aquí afectan a los dos PDFs. Si quieres modificarlo, primero pregunta al usuario qué quiere cambiar (colores, tipografías, espaciados).
- **Las plantillas `AgentPDF.tsx` y `ClientPDF.tsx`** — el diseño visual está pensado al detalle (jerarquía editorial, paleta oscura premium para cliente, denso y legible para agente). Pequeños ajustes vale, pero **no rediseñes** sin pedirlo expresamente.
- **Los tipos en `lib/pdf/types.ts`** — son la API pública del módulo. Si necesitas un campo nuevo, añádelo como opcional y adapta el mapper, no rompas las plantillas.
- **La separación de variantes** — `agent` y `client` deben permanecer separadas. **Nunca mezcles información interna (margen, fuente, notas internas) en el PDF cliente**, ni siquiera en metadatos. Es un riesgo de negocio crítico.

## Lo que SÍ tienes que hacer al integrar

1. **Auth en el route handler y la Server Action**. Buscar el sistema de auth ya usado en TQuot (probablemente Supabase Auth con `@supabase/ssr`) y aplicar dos validaciones:
   - Cualquier acceso: usuario debe tener permisos sobre la cotización.
   - `variant=agent`: además debe ser miembro de la agencia que emite. **Punto crítico de seguridad**: un cliente final con link al recurso no puede ver el PDF interno con costes y márgenes.

2. **Adaptar `lib/pdf/utils/load-quote.ts`** al esquema real de Supabase de TQuot. Los selects asumen nombres convencionales (`quotes`, `agencies`, `clients`, `quote_line_items`, columnas snake_case). Mira el esquema real en `supabase/schema.sql` (o donde lo tengáis) y ajusta los nombres de tabla/columna en el select y el mapper, **sin tocar el output** (debe seguir cumpliendo el tipo `Quote`).

3. **Aplicar la migración SQL** (`supabase/migrations/20260517000000_add_agency_logos.sql`). Antes de aplicarla, **verifica si la tabla `agencies` ya tiene alguna de las columnas** que añade. Los `add column if not exists` son seguros, pero conviene revisar. La política de Storage asume tabla `agency_members(user_id, agency_id)`: si TQuot tiene otro modelo de pertenencia (p. ej. `agencies.owner_id` o un array `member_ids`), adapta el SQL antes de aplicarlo.

4. **Configurar el bucket en Supabase**. La migración crea `agency-logos` como bucket público. Verifica en el dashboard que se ha creado y que las políticas RLS están activas.

5. **Reemplazar el mock `getCurrentUser`** en `app/actions/generate-quote-pdf.ts` y en el route handler. Busca el helper de auth ya existente en TQuot y úsalo.

6. **Smoke test antes de integrar nada**:
   ```bash
   pnpm install
   pnpm preview:pdfs
   ```
   Abre `out/agent.pdf` y `out/client.pdf`. Si los dos se ven bien, la librería funciona en el entorno. Si fallan las fuentes, hay un problema de red en el build/runtime (Google Fonts).

7. **Probar en Vercel preview** antes de mergear. El primer cold-start puede tardar 2-3 s (descarga de fuentes). En llamadas siguientes baja a 400-900 ms.

## Cosas que el primer Claude ya pensó y descartó

- **jsPDF**: descartado por código tedioso (coordenadas absolutas), CSS no soportado, fuentes custom complicadas, mal mantenimiento del diseño.
- **Puppeteer / Chromium headless**: descartado porque en Vercel exige `@sparticuz/chromium` y consume mucha memoria. `@react-pdf/renderer` resuelve lo mismo sin esos costes.
- **Una sola plantilla con `if (variant === "agent")`**: descartado. Dos componentes separados son más mantenibles y reducen el riesgo de filtrar información interna al cliente por accidente.
- **Renderizar a HTML y convertir**: descartado por fidelidad. Mejor escribir directo el árbol PDF declarativo.

## Si te encuentras con problemas

**"Las fuentes no se aplican"** — verifica que `registerFonts()` se está llamando antes de `renderToBuffer`. `render.tsx` lo hace, no debería pasar si no se ha tocado.

**"El logo no carga en el PDF"** — `@react-pdf/renderer` descarga la imagen en tiempo de render. Verificar:
1. El bucket es público.
2. La URL en `agencies.logo_url` es la URL pública completa (`https://...supabase.co/storage/v1/object/public/agency-logos/...`).
3. No hay CORS bloqueando (no debería con bucket público).

**"Error: Cannot find module 'canvas'"** — `@react-pdf/renderer` v4+ no necesita `canvas`. Si te aparece, hay una versión vieja en cache: `rm -rf node_modules && pnpm install`.

**"Edge runtime not supported"** — el route handler tiene `export const runtime = "nodejs"`. No lo cambies a edge.

## Cómo dialogar con el usuario

El usuario **no programa**. Cuando integres:
- Dale instrucciones literales para copiar-pegar.
- Antes de tocar archivos de su proyecto que no son de este módulo, pregunta.
- Si vas a aplicar la migración SQL, avísale y pídele que la revise antes de ejecutarla.
- Si encuentras conflictos con código existente (p. ej. ya tiene una ruta `/api/quotes/[id]/pdf`), **pregúntale** antes de sobrescribir.
