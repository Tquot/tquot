-- Analytics: agencia_analytics RPC + comparator_runs + expire_stale_quotes cron

-- Precondición: bloques A (comparador) y E (versionado) implementados.

-- ── Extensiones ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 0) comparator_runs: persistir comparaciones para ahorro ───────────────

CREATE TABLE IF NOT EXISTS public.comparator_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  hotel_name TEXT NOT NULL,
  nights INT NOT NULL DEFAULT 0,
  /** [{provider, total_price, available, source}] */
  entries JSONB NOT NULL,

  chosen_provider TEXT,
  chosen_total NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comparator_runs_agency_time
  ON public.comparator_runs (agency_id, created_at DESC);

ALTER TABLE public.comparator_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comparator_runs_select ON public.comparator_runs;
CREATE POLICY comparator_runs_select ON public.comparator_runs
  FOR SELECT USING (
    agent_id = auth.uid()
    AND agency_id IN (
      SELECT a.id FROM public.agencies a WHERE a.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS comparator_runs_insert ON public.comparator_runs;
CREATE POLICY comparator_runs_insert ON public.comparator_runs
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()
    AND agency_id IN (
      SELECT a.id FROM public.agencies a WHERE a.owner_id = auth.uid()
    )
  );

-- ── 1) expire_stale_quotes: cron para convertir sent → expired ───────────

CREATE OR REPLACE FUNCTION public.expire_stale_quotes()
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  affected int;
BEGIN
  UPDATE public.quotes
  SET status = 'expired'
  WHERE status = 'sent'
    AND created_at < now() - interval '30 days'
    -- No caducar si hubo actividad reciente del cliente en el enlace público
    -- (adaptación: en este repo usamos quote_shares en vez de quote_views)
    AND id NOT IN (
      SELECT qs.quote_id
      FROM public.quote_shares qs
      WHERE qs.revoked_at IS NULL
        AND qs.last_viewed_at IS NOT NULL
        AND qs.last_viewed_at > now() - interval '7 days'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Programar job (si ya existe, ignorar)
DO $$
BEGIN
  PERFORM cron.schedule(
    'expire-stale-quotes',
    '0 4 * * *',
    'SELECT public.expire_stale_quotes();'
  );
EXCEPTION
  WHEN unique_violation THEN null;
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END
$$;

-- ── 2) agency_analytics: RPC consolidado ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.agency_analytics(
  p_agency_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_span      interval := p_to - p_from;
  v_prev_from timestamptz := p_from - v_span;
  v_result    jsonb;
BEGIN
  WITH
  -- Cotizaciones del periodo (en este repo no existe parent_quote_id,
  -- pero sí guardamos versionado en quote_versions).
  current_quotes AS (
    SELECT *
    FROM public.quotes
    WHERE agency_id = p_agency_id
      AND created_at >= p_from AND created_at < p_to
  ),
  prev_quotes AS (
    SELECT *
    FROM public.quotes
    WHERE agency_id = p_agency_id
      AND created_at >= v_prev_from AND created_at < p_from
  ),
  -- Bloque de totales
  totals AS (
    SELECT
      count(*) AS quotes,
      coalesce(sum(total_public_price), 0) AS volume,
      coalesce(sum(total_public_price)
        FILTER (WHERE status IN ('accepted','reserved')), 0) AS volume_won,
      coalesce(sum(total_public_price - coalesce(total_net_cost, total_public_price))
        FILTER (WHERE status IN ('accepted','reserved')), 0) AS margin_won,
      count(*) FILTER (WHERE status IN ('accepted','reserved')) AS won,

      -- Conversión: denominador honesto según especificación
      count(*)
        FILTER (WHERE status IN ('sent','accepted','reserved','cancelled','expired')) AS decidable,

      count(*) FILTER (WHERE status = 'draft') AS drafts,
      count(*) FILTER (WHERE status = 'sent') AS awaiting,
      count(*) FILTER (WHERE status = 'expired') AS expired,
      count(*) FILTER (WHERE status = 'cancelled') AS cancelled
    FROM current_quotes
  ),
  prev_totals AS (
    SELECT
      count(*) AS quotes,
      coalesce(sum(total_public_price), 0) AS volume,
      count(*) FILTER (WHERE status IN ('accepted','reserved')) AS won,
      count(*)
        FILTER (WHERE status IN ('sent','accepted','reserved','cancelled','expired')) AS decidable
    FROM prev_quotes
  ),
  -- Clientes activos: con al menos una cotización en el periodo
  active_clients AS (
    SELECT count(DISTINCT client_id) AS n
    FROM current_quotes
    WHERE client_id IS NOT NULL
  ),
  -- Serie por día, con días vacíos rellenados a 0
  daily AS (
    SELECT
      d::date AS day,
      count(q.id) AS quotes,
      coalesce(sum(q.total_public_price), 0) AS volume
    FROM generate_series(p_from::date, (p_to - interval '1 day')::date, interval '1 day') AS d
    LEFT JOIN current_quotes q ON q.created_at::date = d::date
    GROUP BY d
    ORDER BY d
  ),
  -- Destinos, con conversión por destino
  destinations AS (
    SELECT
      leg->>'destination' AS name,
      count(*) AS quotes,
      coalesce(sum(q.total_public_price), 0) AS volume,
      count(*) FILTER (WHERE q.status IN ('accepted','reserved')) AS won,
      count(*) FILTER (WHERE q.status <> 'draft') AS decidable
    FROM current_quotes q
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(q.parsed->'legs') = 'array'
          THEN q.parsed->'legs'
        ELSE jsonb_build_array(
          jsonb_build_object(
            'destination',
            coalesce(q.parsed->>'destination', q.destination)
          )
        )
        END
      )
    ) AS leg
    WHERE leg->>'destination' IS NOT NULL
    GROUP BY 1
    ORDER BY quotes DESC, volume DESC
    LIMIT 8
  ),
  -- Proveedores: apariciones y elecciones desde el snapshot de la cotización
  provider_appearances AS (
    SELECT
      item->>'provider' AS provider,
      count(DISTINCT q.id) AS appearances
    FROM current_quotes q
    CROSS JOIN LATERAL (
      SELECT jsonb_array_elements(coalesce(q.snapshot->'hotels', '[]'::jsonb)) AS item
      UNION ALL
      SELECT jsonb_array_elements(coalesce(q.snapshot->'flights', '[]'::jsonb)) AS item
      UNION ALL
      SELECT jsonb_array_elements(coalesce(q.snapshot->'experiences', '[]'::jsonb)) AS item
      UNION ALL
      SELECT jsonb_array_elements(coalesce(q.snapshot->'transfers', '[]'::jsonb)) AS item
    ) items
    WHERE item->>'provider' IS NOT NULL
    GROUP BY 1
  ),
  provider_chosen AS (
    SELECT
      item->>'provider' AS provider,
      count(DISTINCT q.id) AS chosen
    FROM current_quotes q
    CROSS JOIN LATERAL (
      SELECT jsonb_array_elements(coalesce(q.snapshot->'hotels', '[]'::jsonb)) AS item
      UNION ALL
      SELECT jsonb_array_elements(coalesce(q.snapshot->'flights', '[]'::jsonb)) AS item
      UNION ALL
      SELECT jsonb_array_elements(coalesce(q.snapshot->'experiences', '[]'::jsonb)) AS item
      UNION ALL
      SELECT jsonb_array_elements(coalesce(q.snapshot->'transfers', '[]'::jsonb)) AS item
    ) items
    WHERE COALESCE((item->>'alternative')::boolean, false) IS FALSE
      AND item->>'provider' IS NOT NULL
    GROUP BY 1
  ),
  providers AS (
    SELECT
      a.provider AS name,
      a.appearances,
      coalesce(c.chosen, 0) AS chosen
    FROM provider_appearances a
    LEFT JOIN provider_chosen c USING (provider)
    ORDER BY a.appearances DESC
    LIMIT 8
  ),
  -- Ahorro del comparador: mediana de disponibles menos elegido, suelo en 0
  comparator AS (
    SELECT
      count(*) AS runs,
      coalesce(
        sum(GREATEST(median_price - chosen_total, 0)),
        0
      ) AS saving
    FROM (
      SELECT
        cr.chosen_total,
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY (e->>'total_price')::numeric
        ) AS median_price
      FROM public.comparator_runs cr
      CROSS JOIN LATERAL jsonb_array_elements(cr.entries) AS e
      WHERE cr.agency_id = p_agency_id
        AND cr.created_at >= p_from AND cr.created_at < p_to
        AND (e->>'available')::boolean IS TRUE
        AND (e->>'total_price') IS NOT NULL
        AND cr.chosen_total IS NOT NULL
      GROUP BY cr.id, cr.chosen_total
      HAVING count(*) >= 2
    ) per_run
  )
  SELECT jsonb_build_object(
    'range', jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'days', extract(day from v_span)
    ),

    'quotes', jsonb_build_object(
      'count', t.quotes,
      'prev_count', pt.quotes,
      'delta_pct', CASE WHEN pt.quotes > 0
        THEN round(((t.quotes - pt.quotes)::numeric / pt.quotes) * 100)
        ELSE NULL END
    ),

    'volume', jsonb_build_object(
      'quoted', round(t.volume, 2),
      'won', round(t.volume_won, 2),
      'margin_won', round(t.margin_won, 2),
      'avg_ticket', CASE WHEN t.quotes > 0 THEN round(t.volume / t.quotes, 2) ELSE 0 END,
      'prev_quoted', round(pt.volume, 2),
      'delta_pct', CASE WHEN pt.volume > 0
        THEN round(((t.volume - pt.volume) / pt.volume) * 100)
        ELSE NULL END
    ),

    'conversion', jsonb_build_object(
      'won', t.won,
      'decidable', t.decidable,
      'rate_pct', CASE WHEN t.decidable > 0
        THEN round((t.won::numeric / t.decidable) * 100, 1)
        ELSE NULL END,
      'prev_rate_pct', CASE WHEN pt.decidable > 0
        THEN round((pt.won::numeric / pt.decidable) * 100, 1)
        ELSE NULL END
    ),

    'funnel', jsonb_build_object(
      'draft', t.drafts,
      'awaiting', t.awaiting,
      'won', t.won,
      'expired', t.expired,
      'cancelled', t.cancelled
    ),

    'active_clients', (SELECT n FROM active_clients),

    'comparator', jsonb_build_object(
      'runs', (SELECT runs FROM comparator),
      'total_quotes', t.quotes,
      'saving', round((SELECT saving FROM comparator), 2),
      'basis', 'median_of_available'
    ),

    'daily', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'day', day,
          'quotes', quotes,
          'volume', round(volume, 2)
        )
      )
      FROM daily
    ),

    'destinations', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', name,
            'quotes', quotes,
            'volume', round(volume, 2),
            'won', won,
            'decidable', decidable,
            'conversion_pct', CASE
              WHEN decidable > 0 THEN round((won::numeric / decidable) * 100)
              ELSE NULL END
          )
        ),
        '[]'::jsonb
      )
      FROM destinations
    ),

    'providers', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', name,
            'appearances', appearances,
            'chosen', chosen,
            'win_rate_pct', CASE WHEN appearances > 0
              THEN round((chosen::numeric / appearances) * 100)
              ELSE 0 END
          )
        ),
        '[]'::jsonb
      )
      FROM providers
    )
  )
  INTO v_result
  FROM totals t, prev_totals pt;

  RETURN v_result;
END;
$$;

-- Índices (para que el RPC aguante con datos reales)
CREATE INDEX IF NOT EXISTS quotes_agency_created_root
  ON public.quotes (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS quotes_agency_status
  ON public.quotes (agency_id, status);

CREATE INDEX IF NOT EXISTS quotes_parsed_legs_gin
  ON public.quotes USING gin ((parsed -> 'legs'));

CREATE INDEX IF NOT EXISTS quotes_snapshot_gin
  ON public.quotes USING gin (snapshot);

-- comparator_runs_agency_time ya existe arriba

