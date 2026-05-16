create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (
    category in ('hotels', 'experiences', 'suppliers', 'tour_operators')
  ),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.inventory enable row level security;

create policy "Users can read own inventory"
  on public.inventory
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own inventory"
  on public.inventory
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory"
  on public.inventory
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own inventory"
  on public.inventory
  for delete
  using (auth.uid() = user_id);

create index if not exists inventory_user_category_created_idx
  on public.inventory (user_id, category, created_at desc);
