begin;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, update(name) on public.profiles to authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
create policy profile_read on public.profiles for select to authenticated using (id=(select auth.uid()) or (select public.is_admin()));
create policy profile_name on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

create function public.create_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id,name) values(new.id,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'),''),'Creovate client'),120));
  return new;
end $$;
revoke all on function public.create_profile() from public;
create trigger create_profile after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id,name) select id,left(coalesce(nullif(btrim(raw_user_meta_data->>'name'),''),'Creovate client'),120) from auth.users on conflict do nothing;

create function public.touch_record() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['services','portfolio','creators','project_inquiries','projects','project_milestones','project_deliverables','campaigns','campaign_metrics','creator_shortlists','brand_kits','proposals','consultation_bookings','feedback','notifications'] loop
    execute format('create table public.%I (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references public.profiles(id) on delete cascade,
      data jsonb not null check (jsonb_typeof(data) = ''object'' and octet_length(data::text) <= 65536),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )',t);
    execute format('alter table public.%I enable row level security',t);
    execute format('create index on public.%I (user_id,created_at)',t);
    execute format('create trigger touch_record before update on public.%I for each row execute function public.touch_record()',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, delete, insert(id,user_id,data), update(data) on public.%I to authenticated',t);
    execute format('create policy agency_access on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',t);
    execute format('create policy own_read on public.%I for select to authenticated using (user_id=(select auth.uid()))',t);
  end loop;
  foreach t in array array['services','portfolio','creators'] loop
    execute format('grant select on public.%I to anon',t);
    execute format('create policy public_catalog on public.%I for select to anon, authenticated using (true)',t);
    execute format('create unique index on public.%I ((data->>''id''))',t);
    execute format('alter table public.%I add check (user_id is null and coalesce(data->>''id'','''') ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'' and length(btrim(coalesce(data->>''name'',''''))) between 1 and 120)',t);
  end loop;
  foreach t in array array['campaigns','brand_kits','proposals','creator_shortlists'] loop
    execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id=(select auth.uid()))',t);
    execute format('create policy own_delete on public.%I for delete to authenticated using (user_id=(select auth.uid()))',t);
    if t <> 'creator_shortlists' then
      execute format('create policy own_update on public.%I for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
    end if;
  end loop;
end $$;

alter table public.creators add column slug text generated always as (data->>'id') stored unique;
alter table public.creator_shortlists add column creator_slug text generated always as (data->>'creator') stored not null references public.creators(slug) on delete cascade;
create unique index shortlist_owner_creator on public.creator_shortlists (user_id,creator_slug);

alter table public.projects add column inquiry_id uuid generated always as (nullif(data->>'inquiry','')::uuid) stored unique references public.project_inquiries(id);
alter table public.projects add check ((data->>'status') in ('Approved','In progress','In review','Completed','Archived') and (data->>'progress')::numeric between 0 and 100);
alter table public.project_milestones add column project_id uuid generated always as ((data->>'project')::uuid) stored not null references public.projects(id) on delete cascade;
alter table public.project_deliverables add column project_id uuid generated always as ((data->>'project')::uuid) stored not null references public.projects(id) on delete cascade;
alter table public.feedback add column project_id uuid generated always as ((data->>'project')::uuid) stored not null references public.projects(id) on delete cascade;
alter table public.campaign_metrics add column campaign_id uuid generated always as ((data->>'campaign')::uuid) stored not null references public.campaigns(id) on delete cascade;
create index on public.project_milestones (project_id);
create index on public.project_deliverables (project_id);
create index on public.feedback (project_id);
create unique index campaign_metric_day on public.campaign_metrics (campaign_id,(data->>'date'));
alter table public.campaign_metrics add check ((data->>'date') ~ '^\d{4}-\d{2}-\d{2}$' and (data->>'reach')::numeric >= 0 and (data->>'impressions')::numeric >= 0 and (data->>'engagements')::numeric >= 0 and (data->>'clicks')::numeric >= 0 and (data->>'conversions')::numeric >= 0 and (data->>'spend')::numeric >= 0);

alter table public.project_inquiries add check (
  coalesce(data->>'status','') in ('pending','approved','rejected')
  and length(btrim(coalesce(data->>'name',''))) between 1 and 120
  and length(btrim(coalesce(data->>'brand',''))) between 1 and 120
  and length(btrim(coalesce(data->>'objective',''))) between 12 and 3000
  and coalesce(data->>'email','') ~ '^[^[:space:]@]+@[^[:space:]@]+$'
  and case when jsonb_typeof(data->'services')='array' then jsonb_array_length(data->'services')>0 else false end
);
grant insert(id,user_id,data) on public.project_inquiries to anon;
create policy guest_inquiry on public.project_inquiries for insert to anon with check (user_id is null and data->>'status'='pending');
create policy client_inquiry on public.project_inquiries for insert to authenticated with check (user_id=(select auth.uid()) and data->>'status'='pending');
create policy client_edit_inquiry on public.project_inquiries for update to authenticated using (user_id=(select auth.uid()) and data->>'status'='pending') with check (user_id=(select auth.uid()) and data->>'status'='pending');
create function public.guard_inquiry_status() returns trigger language plpgsql set search_path='' as $$
begin
  if old.data->>'status' <> 'pending' and old.data->>'status' is distinct from new.data->>'status' then
    raise exception 'This inquiry has already been reviewed.';
  end if;
  return new;
end $$;
create trigger guard_inquiry_status before update on public.project_inquiries for each row execute function public.guard_inquiry_status();

create function public.approve_inquiry(inquiry_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare inquiry public.project_inquiries; new_project uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into inquiry from public.project_inquiries where id=inquiry_id for update;
  if not found or inquiry.data->>'status' <> 'pending' then raise exception 'This inquiry has already been reviewed or is unavailable.'; end if;
  insert into public.projects(user_id,data)
  values(inquiry.user_id,jsonb_build_object('title',inquiry.data->>'brand','status','Approved','brief',inquiry.data-'status','progress',0,'due','','inquiry',inquiry.id))
  returning id into new_project;
  update public.project_inquiries set data=jsonb_set(data,'{status}','"approved"') where id=inquiry.id;
  if inquiry.user_id is not null then
    insert into public.notifications(user_id,data) values(inquiry.user_id,jsonb_build_object('message',(inquiry.data->>'brand')||' was approved.','read',false));
  end if;
  return new_project;
end $$;
revoke all on function public.approve_inquiry(uuid) from public;
grant execute on function public.approve_inquiry(uuid) to authenticated;

create function public.notify_project_update() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is not null and (old.data->>'status',old.data->>'progress') is distinct from (new.data->>'status',new.data->>'progress') then
    insert into public.notifications(user_id,data) values(new.user_id,jsonb_build_object('message',(new.data->>'title')||' · '||(new.data->>'status')||' · '||(new.data->>'progress')||'% complete','read',false));
  end if;
  return new;
end $$;
create trigger notify_project_update after update on public.projects for each row execute function public.notify_project_update();

create policy client_feedback on public.feedback for insert to authenticated with check (
  user_id=(select auth.uid()) and not (data?'reply') and length(btrim(coalesce(data->>'message',''))) between 5 and 1500
  and data->>'type' in ('Feedback','Revision request')
  and exists(select 1 from public.projects where id=project_id and user_id=(select auth.uid()))
);
create policy mark_notification_read on public.notifications for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create function public.guard_notification() returns trigger language plpgsql set search_path='' as $$
begin
  if not public.is_admin() and (new.data-'read') is distinct from (old.data-'read') then
    raise exception 'Only the read flag can be updated.';
  end if;
  return new;
end $$;
create trigger guard_notification before update on public.notifications for each row execute function public.guard_notification();

alter table public.consultation_bookings add check (
  coalesce(data->>'status','') in ('booked','cancelled')
  and coalesce(data->>'date','') ~ '^\d{4}-\d{2}-\d{2}$'
  and coalesce(data->>'time','') in ('10:00','11:00','12:00','14:00','15:00','16:00')
  and length(btrim(coalesce(data->>'name',''))) between 1 and 120
  and length(btrim(coalesce(data->>'service',''))) between 1 and 120
  and length(btrim(coalesce(data->>'purpose',''))) between 10 and 1500
  and coalesce(data->>'email','') ~ '^[^[:space:]@]+@[^[:space:]@]+$'
);
create unique index one_booking_per_slot on public.consultation_bookings ((data->>'date'),(data->>'time')) where data->>'status'='booked';
grant insert(id,user_id,data) on public.consultation_bookings to anon;
create policy guest_booking on public.consultation_bookings for insert to anon with check (user_id is null and data->>'status'='booked');
create policy client_booking on public.consultation_bookings for insert to authenticated with check (user_id=(select auth.uid()) and data->>'status'='booked');
create policy cancel_booking on public.consultation_bookings for update to authenticated using (user_id=(select auth.uid()) and data->>'status'='booked') with check (user_id=(select auth.uid()) and data->>'status'='cancelled');
create function public.guard_booking() returns trigger language plpgsql set search_path='' as $$
declare starts timestamptz;
begin
  if tg_op='UPDATE' then
    if (new.data-'status') is distinct from (old.data-'status') or old.data->>'status'<>'booked' or new.data->>'status'<>'cancelled' then
      raise exception 'Bookings can only be cancelled. Create a new booking to change the time.';
    end if;
  else
    starts := ((new.data->>'date')||' '||(new.data->>'time'))::timestamp at time zone 'Asia/Kolkata';
    if starts <= now() or extract(isodow from (new.data->>'date')::date)>5 then raise exception 'Select a future weekday slot.'; end if;
  end if;
  return new;
end $$;
create trigger guard_booking before insert or update on public.consultation_bookings for each row execute function public.guard_booking();

create function public.reserved_slots(booking_date date) returns table(slot text)
language sql stable security definer set search_path=''
as $$ select data->>'time' from public.consultation_bookings where data->>'date'=booking_date::text and data->>'status'='booked' $$;
revoke all on function public.reserved_slots(date) from public;
grant execute on function public.reserved_slots(date) to anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit) values('deliverables','deliverables',false,10485760) on conflict(id) do nothing;
create policy deliverables_read on storage.objects for select to authenticated using (
  bucket_id='deliverables' and ((select public.is_admin()) or (storage.foldername(name))[1]=(select auth.uid())::text)
);
create policy deliverables_admin_write on storage.objects for insert to authenticated with check (bucket_id='deliverables' and (select public.is_admin()));
create policy deliverables_admin_delete on storage.objects for delete to authenticated using (bucket_id='deliverables' and (select public.is_admin()));
commit;
