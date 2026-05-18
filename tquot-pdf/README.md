# TQuot — Sistema de PDFs premium

Generación de PDFs profesionales para cotizaciones de viaje. Dos variantes desde la misma fuente de datos:

- **PDF Agente** — desglose interno con margen, fuente de precio `[INV-PROPIO]` `[CORPORATIVO]` `[WEB]` y notas internas. Cabecera "COTIZACIÓN INTERNA — CONFIDENCIAL".
- **PDF Cliente** — propuesta premium con portada oscura editorial, disclaimer legal y logo de la agencia. Sin información interna.

Stack: Next.js 15 + TypeScript + `@react-pdf/renderer` + Supabase. Funciona en Vercel sin configuración especial.

---

## Instalación

```bash
pnpm install
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

## Previsualización local sin Next

```bash
pnpm preview:pdfs
```

Genera `out/agent.pdf` y `out/client.pdf` con datos mock. Ábrelos para revisar el diseño antes de integrarlos en la app.

## Migración de Supabase

```bash
# Si usas Supabase CLI:
supabase migration up

# O ejecuta el contenido de:
#   supabase/migrations/20260517000000_add_agency_logos.sql
# en el SQL Editor de Supabase.
```

La migración:
1. Añade `logo_url`, `legal_name`, `tax_id`, `address`, etc. a la tabla `agencies`.
2. Crea el bucket `agency-logos` en Storage (público).
3. Define políticas RLS: lectura pública, escritura solo por miembros de la agencia.

---

## Uso desde la app

### Opción 1 — Route handler (recomendado para descargas con `<a>`)

```tsx
// En un botón de la UI:
<a
  href={`/api/quotes/${quoteId}/pdf?variant=client`}
  target="_blank"
  rel="noopener noreferrer"
>
  Descargar propuesta
</a>

<a href={`/api/quotes/${quoteId}/pdf?variant=agent&inline=1`}>
  Ver desglose interno
</a>
```

### Opción 2 — Server Action (para flujos con confirmación previa)

```tsx
"use client";
import { generateQuotePdf } from "@/app/actions/generate-quote-pdf";

async function handleDownload() {
  const result = await generateQuotePdf({ quoteId, variant: "client" });
  if (!result.ok) {
    alert(result.error);
    return;
  }

  const blob = new Blob(
    [Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))],
    { type: result.contentType }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Subir el logo de una agencia

```tsx
import { uploadAgencyLogo } from "@/lib/pdf/logo-storage";

const result = await uploadAgencyLogo({
  agencyId,
  file: bufferDelArchivo,
  contentType: "image/png",
});
// result.publicUrl ya queda guardado en agencies.logo_url
```

---

## Estructura

```
lib/pdf/
├── theme.ts                      ← paleta, tipografías, espaciados
├── fonts.ts                      ← registro de Google Fonts
├── types.ts                      ← Quote, Agency, etc.
├── render.tsx                    ← punto de entrada (renderQuotePdf)
├── logo-storage.ts               ← subida/borrado de logos en Supabase
├── templates/
│   ├── AgentPDF.tsx              ← PDF interno
│   └── ClientPDF.tsx             ← PDF cliente premium
├── components/
│   ├── AgencyLogo.tsx            ← logo con fallback tipográfico
│   ├── Decoration.tsx            ← GoldRule, GoldDivider, SectionLabel
│   └── SourceBadge.tsx           ← etiquetas [INV-PROPIO] etc.
└── utils/
    ├── format.ts                 ← formatear moneda, fechas, %
    ├── load-quote.ts             ← carga desde Supabase + mapper
    └── mock-quote.ts             ← datos para preview

app/
├── actions/
│   └── generate-quote-pdf.ts     ← Server Action
└── api/quotes/[id]/pdf/route.ts  ← GET /api/quotes/:id/pdf

supabase/migrations/
└── 20260517000000_add_agency_logos.sql

scripts/
└── preview-pdfs.ts               ← pnpm preview:pdfs
```

---

## Sistema de diseño

Toda la marca visual vive en `lib/pdf/theme.ts`. Tres variables y se actualiza el aspecto de los dos PDFs.

**Paleta clave:**
- `ink` `#0B1220` — azul tinta profundo (fondo cliente)
- `gold` `#C9A961` — dorado champagne (acentos)
- `paper` `#FAF8F3` — crema cálido (fondo agente y páginas internas)

**Tipografía:**
- `CormorantGaramond` — serif editorial para títulos y mensajes
- `Inter` — sans para cuerpo y datos
- `Courier` — mono para referencias y números técnicos

---

## Funciona en Vercel sin tocar nada

`@react-pdf/renderer` es JavaScript puro, no necesita Chromium. Las rutas usan `runtime = "nodejs"` (no edge) porque la librería usa APIs de Node. En funciones serverless de Vercel típicas, un PDF se genera en 400-900 ms.

---

## Pendientes antes de producción

Cada `TODO[INTEGRACION]` en el código está alineado con esta lista:

1. **Auth y permisos** en el route handler y la Server Action. Validar que el usuario tiene acceso a la cotización. **Crítico**: en `variant=agent` validar adicionalmente que el usuario pertenece a la agencia emisora. Un cliente con acceso al recurso NUNCA debe poder ver el PDF interno con márgenes.

2. **Mapper en `load-quote.ts`**. Asume nombres de columnas convencionales. Adapta los selects al esquema real de TQuot sin tocar las plantillas.

3. **Política de Supabase Storage**: asume tabla `agency_members(user_id, agency_id)`. Si tu modelo de pertenencia es distinto, ajustar el SQL.

4. **Cacheo** (opcional). Generar el mismo PDF dos veces es desperdicio. Si el volumen sube, cachear por hash del contenido en Vercel KV o Supabase Storage.

5. **Disclaimer legal**. El que viene por defecto en `ClientPDF.tsx` es genérico. Cada agencia puede sobreescribirlo con `agencies.legal_disclaimer`. Revisar con abogado antes de salir a producción.
