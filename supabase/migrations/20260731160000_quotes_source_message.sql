-- Guarda el mensaje original pegado (WhatsApp/email) antes del sanitize.
-- Útil para depurar parses fallidos sin perder el raw del cliente.

alter table public.quotes
  add column if not exists source_message text;

comment on column public.quotes.source_message is
  'Mensaje informal original (WhatsApp/email/notas) sin sanitize. NULL si no aplica.';
