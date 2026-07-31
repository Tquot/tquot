-- Extend quote_status enum: confirmed (Confirmada), in_progress (En reserva)
-- Postgres enums have no CHECK constraint; ADD VALUE is the correct migration.

ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'confirmed' AFTER 'sent';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'accepted';

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS in_progress_at timestamptz;
