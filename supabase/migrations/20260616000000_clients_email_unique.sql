-- Unique email per agent (allows multiple NULL emails)
create unique index if not exists clients_user_email_unique
  on public.clients (user_id, lower(email))
  where email is not null;
