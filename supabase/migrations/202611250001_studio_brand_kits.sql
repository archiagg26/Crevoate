-- Install the Studio table on projects with an existing profiles schema.
-- Keep an existing workspace table and its policies intact.
do $$
begin
  if to_regclass('public.brand_kits') is not null then
    return;
  end if;

  create table public.brand_kits (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    data jsonb not null check (jsonb_typeof(data) = 'object')
  );
  create index brand_kits_owner_created_idx on public.brand_kits (user_id, created_at);

  alter table public.brand_kits enable row level security;
  revoke all on public.brand_kits from public, anon, authenticated;
  grant select, delete, insert(user_id, data), update(data) on public.brand_kits to authenticated;

  create policy brand_kits_owner_read on public.brand_kits
    for select to authenticated using (user_id = (select auth.uid()));
  create policy brand_kits_owner_insert on public.brand_kits
    for insert to authenticated with check (user_id = (select auth.uid()));
  create policy brand_kits_owner_update on public.brand_kits
    for update to authenticated using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));
  create policy brand_kits_owner_delete on public.brand_kits
    for delete to authenticated using (user_id = (select auth.uid()));

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.brand_kits;
  end if;
end
$$;
