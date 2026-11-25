-- Extend structured campaign projects in place. The full workspace already has data.
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='campaigns' and column_name='data'
  ) then
    alter table public.campaigns add column data jsonb;
    update public.campaigns c set data = jsonb_build_object(
      'title', coalesce(to_jsonb(c)->>'title',''),
      'brand', coalesce(to_jsonb(c)->>'brand_name',''),
      'industry', '', 'product', '', 'website', '', 'description', coalesce(to_jsonb(c)->>'description',''),
      'objective', coalesce(to_jsonb(c)->>'objective','Brand awareness'),
      'age', '', 'location', '', 'interests', '', 'audience', coalesce(to_jsonb(c)->>'target_audience',''),
      'channels', case jsonb_typeof(to_jsonb(c)->'platform')
        when 'array' then to_jsonb(c)->'platform'
        when 'string' then to_jsonb(regexp_split_to_array(to_jsonb(c)->>'platform', '[[:space:]]*,[[:space:]]*'))
        else '[]'::jsonb end,
      'budget', coalesce(to_jsonb(c)->'budget','0'::jsonb),
      'start', coalesce(to_jsonb(c)->>'start_date',''),
      'duration', greatest(1, coalesce((to_jsonb(c)->>'end_date')::date - (to_jsonb(c)->>'start_date')::date + 1, 1)),
      'deliverables', '', 'creators', '[]'::jsonb
    );
    grant select(data), insert(data), update(data) on public.campaigns to authenticated;
  end if;
end $$;

create or replace function public.campaign_planner_fields() returns trigger
language plpgsql set search_path=''
as $$
declare
  brief jsonb := new.data;
  fields jsonb;
  launch date;
  platform_type text;
begin
  if brief is null or (tg_op = 'UPDATE' and
     (brief - 'calendar') is not distinct from (old.data - 'calendar')) then return new; end if;
  launch := nullif(brief->>'start','')::date;
  fields := jsonb_strip_nulls(jsonb_build_object(
    'title', coalesce(nullif(brief->>'title',''),nullif(brief->>'brand','')),
    'brand_name', brief->>'brand',
    'description', brief->>'description',
    'objective', brief->>'objective',
    'target_audience', brief->>'audience',
    'budget', brief->'budget',
    'start_date', launch,
    'end_date', launch + greatest(0, coalesce((brief->>'duration')::int, 1) - 1)
  ));
  if jsonb_typeof(brief->'channels') = 'array' then
    select format_type(a.atttypid, null) into platform_type
    from pg_catalog.pg_attribute a
    where a.attrelid=tg_relid and a.attname='platform' and not a.attisdropped;
    if platform_type in ('text', 'character varying') then
      fields := fields || jsonb_build_object('platform', (
        select string_agg(channel, ', ') from jsonb_array_elements_text(brief->'channels') channel
      ));
    elsif platform_type in ('text[]','character varying[]','json','jsonb') then
      fields := fields || jsonb_build_object('platform', brief->'channels');
    end if;
  end if;
  return jsonb_populate_record(new, fields);
end $$;
revoke all on function public.campaign_planner_fields() from public;

do $$
begin
  if exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='campaigns' and column_name='brand_name'
  ) and not exists (select 1 from pg_trigger where tgrelid='public.campaigns'::regclass and tgname='campaign_planner_fields') then
    create trigger campaign_planner_fields before insert or update of data on public.campaigns
      for each row execute function public.campaign_planner_fields();
  end if;
end $$;

create table if not exists public.campaign_calendar (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 8192),
  position integer not null check (position >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, position)
);
create index if not exists campaign_calendar_owner on public.campaign_calendar(user_id,campaign_id);
alter table public.campaign_calendar enable row level security;
revoke all on public.campaign_calendar from anon, authenticated;
grant select on public.campaign_calendar to authenticated;
drop policy if exists calendar_owner_read on public.campaign_calendar;
create policy calendar_owner_read on public.campaign_calendar for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.sync_campaign_calendar() returns trigger
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

do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid='public.campaigns'::regclass and tgname='sync_campaign_calendar') then
    create trigger sync_campaign_calendar after insert or update of data on public.campaigns
      for each row execute function public.sync_campaign_calendar();
    insert into public.campaign_calendar(campaign_id,user_id,data,position)
    select c.id,c.user_id,entry,ordinality::integer from public.campaigns c
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(c.data->'calendar')='array' then c.data->'calendar' else '[]'::jsonb end
    ) with ordinality as entries(entry,ordinality)
    on conflict (campaign_id,position) do nothing;
  end if;
end $$;

-- Compare only the calendar, keeping simultaneous updates to the campaign brief.
create or replace function public.update_campaign_calendar(campaign uuid, expected_calendar jsonb, next_calendar jsonb)
returns void language plpgsql security invoker set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to edit this calendar' using errcode='42501'; end if;
  if jsonb_typeof(next_calendar) is distinct from 'array'
      or jsonb_array_length(next_calendar) > 500 then
    raise exception 'The calendar must be an array with at most 500 entries' using errcode='22023';
  end if;
  if exists (select 1 from jsonb_array_elements(next_calendar) entry
      where jsonb_typeof(entry) <> 'object' or coalesce(entry->>'id','') = '') or
      (select count(distinct entry->>'id') from jsonb_array_elements(next_calendar) entry) <> jsonb_array_length(next_calendar) then
    raise exception 'Calendar entries must have unique IDs' using errcode='22023';
  end if;
  update public.campaigns c
  set data = jsonb_set(coalesce(c.data, '{}'::jsonb), '{calendar}', next_calendar)
  where c.id = campaign and coalesce(c.data->'calendar','[]'::jsonb) = expected_calendar;
  if not found then
    if not exists (select 1 from public.campaigns c where c.id = campaign) then
      raise exception 'Campaign is unavailable' using errcode='42501';
    end if;
    raise exception 'Calendar changed since it was opened' using errcode='40001';
  end if;
end $$;
revoke all on function public.update_campaign_calendar(uuid,jsonb,jsonb) from public;
grant execute on function public.update_campaign_calendar(uuid,jsonb,jsonb) to authenticated;

do $$
declare target text;
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    foreach target in array array['campaigns','campaign_calendar'] loop
      if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=target) then
        execute format('alter publication supabase_realtime add table public.%I', target);
      end if;
    end loop;
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('campaign-creative','campaign-creative',false,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;

create policy campaign_creative_read on storage.objects for select to authenticated
using (bucket_id='campaign-creative' and exists (
  select 1 from public.campaigns c
  where c.id::text=(storage.foldername(name))[2] and c.user_id::text=(storage.foldername(name))[1]
));
create policy campaign_creative_insert on storage.objects for insert to authenticated
with check (bucket_id='campaign-creative'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and lower(storage.extension(name)) in ('jpeg','png','webp','avif')
  and exists (
    select 1 from public.campaigns c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid())
  )
);
