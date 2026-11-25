begin;

create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id,name) values(new.id,left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'name'),''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'),''),
    'Creovate client'),120));
  return new;
end $$;

update public.profiles p set name=left(btrim(u.raw_user_meta_data->>'full_name'),120)
from auth.users u where p.id=u.id and p.name='Creovate client'
and nullif(btrim(u.raw_user_meta_data->>'full_name'),'') is not null;

create table public.campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null check (
    jsonb_typeof(data)='object' and octet_length(data::text)<=65536
    and coalesce(data->>'scope','') ~ '^(new|[a-fA-F0-9-]{36})$'
    and coalesce(data->>'step','') ~ '^[0-5]$'
    and coalesce(jsonb_typeof(data->'form'),'')='object'
  ),
  scope text generated always as (data->>'scope') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,scope)
);
alter table public.campaign_drafts enable row level security;
revoke all on public.campaign_drafts from anon, authenticated;
grant select, delete, insert(user_id,data), update(data) on public.campaign_drafts to authenticated;
create policy draft_owner on public.campaign_drafts for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create trigger touch_record before update on public.campaign_drafts for each row execute function public.touch_record();
create function public.save_campaign_draft(draft jsonb) returns void
language sql set search_path=''
as $$
  insert into public.campaign_drafts(user_id,data) values ((select auth.uid()),draft)
  on conflict(user_id,scope) do update set data=excluded.data;
$$;
revoke all on function public.save_campaign_draft(jsonb) from public;
grant execute on function public.save_campaign_draft(jsonb) to authenticated;

create table public.campaign_calendar (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data)='object' and octet_length(data::text)<=8192),
  position integer not null check (position>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, position)
);
create index campaign_calendar_owner on public.campaign_calendar(user_id,campaign_id);
alter table public.campaign_calendar enable row level security;
revoke all on public.campaign_calendar from anon, authenticated;
grant select on public.campaign_calendar to authenticated;
create policy calendar_read on public.campaign_calendar for select to authenticated using (user_id=(select auth.uid()) or (select public.is_admin()));

create function public.sync_campaign_calendar() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='UPDATE' and new.data->'calendar' is not distinct from old.data->'calendar' then return new; end if;
  delete from public.campaign_calendar where campaign_id=new.id;
  if jsonb_typeof(new.data->'calendar')='array' then
    insert into public.campaign_calendar(campaign_id,user_id,data,position)
    select new.id,new.user_id,entry,ordinality::integer
    from jsonb_array_elements(new.data->'calendar') with ordinality as entries(entry,ordinality);
  end if;
  return new;
end $$;
revoke all on function public.sync_campaign_calendar() from public;
create trigger sync_campaign_calendar after insert or update of data on public.campaigns for each row execute function public.sync_campaign_calendar();
insert into public.campaign_calendar(campaign_id,user_id,data,position)
select c.id,c.user_id,entry,ordinality::integer from public.campaigns c
cross join lateral jsonb_array_elements(case when jsonb_typeof(c.data->'calendar')='array' then c.data->'calendar' else '[]'::jsonb end)
with ordinality as entries(entry,ordinality);

create function public.notify_inquiry_rejected() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.user_id is not null and old.data->>'status'='pending' and new.data->>'status'='rejected' then
    insert into public.notifications(user_id,data)
    values(new.user_id,jsonb_build_object('message','Your inquiry for '||(new.data->>'brand')||' was reviewed and declined.','read',false));
  end if;
  return new;
end $$;
create trigger notify_inquiry_rejected after update on public.project_inquiries for each row execute function public.notify_inquiry_rejected();

do $$
declare table_name text;
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach table_name in array array['projects','project_milestones','project_deliverables','project_inquiries','notifications','campaigns','brand_kits','consultation_bookings','feedback'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
        execute format('alter publication supabase_realtime add table public.%I',table_name);
      end if;
    end loop;
  end if;
end $$;

-- Remove former demo creator fixtures by their original slug and name.
delete from public.creators where (data->>'id',data->>'name') in (
  ('creator-0','Ira Sen'),('creator-1','Kabir Rao'),('creator-2','Neha Gill'),
  ('creator-3','Ayaan Das'),('creator-4','Rhea Jain'),('creator-5','Dev Malik'),
  ('creator-6','Sana Mir'),('creator-7','Tara Bose')
);

commit;

