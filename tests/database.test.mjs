import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("workspace migrations enforce ownership, admin approval and slot uniqueness", async () => {
  const db = new PGlite();
  const client = "10000000-0000-4000-8000-000000000001";
  const admin = "10000000-0000-4000-8000-000000000002";
  const stranger = "10000000-0000-4000-8000-000000000003";
  const inquiry = "20000000-0000-4000-8000-000000000001";
  const guest = "20000000-0000-4000-8000-000000000002";
  const brief = JSON.stringify({
    name: "Client",
    brand: "Test project",
    email: "client@example.test",
    objective: "Launch a new visual identity.",
    services: ["branding"],
    status: "pending",
  });
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create publication supabase_realtime;
      create schema auth; create schema storage;
      grant usage on schema auth,storage to anon,authenticated;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
      create function storage.extension(name text) returns text language sql as $$ select split_part(name,'.',2) $$;
    `);
    for (const file of [
      "202611240001_workspace.sql",
      "202611240002_catalog.sql",
      "202611240003_dissara_project.sql",
      "202611240004_connected_workspace.sql",
      "202611250001_studio_brand_kits.sql",
      "202611250002_campaign_calendar.sql",
    ]) {
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    }
    await db.query("insert into auth.users(id) values ($1),($2),($3)", [
      client,
      admin,
      stranger,
    ]);
    await db.query("update public.profiles set role='admin' where id=$1", [
      admin,
    ]);
    async function as(role, id = "") {
      await db.exec("reset role; set role " + role);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
    }
    assert.equal(
      (
        await db.query(
          "select count(*)::int as total from pg_publication_tables where pubname='supabase_realtime'",
        )
      ).rows[0].total,
      10,
    );
    const google = "10000000-0000-4000-8000-000000000004";
    await db.query(
      "insert into auth.users(id,raw_user_meta_data) values($1,$2)",
      [google, JSON.stringify({ full_name: "Google Client", role: "admin" })],
    );
    assert.deepEqual(
      (
        await db.query("select name,role from public.profiles where id=$1", [
          google,
        ])
      ).rows,
      [{ name: "Google Client", role: "client" }],
    );
    await as("anon");
    assert.equal(
      (await db.query("select id from public.services")).rows.length,
      7,
    );
    await db.query(
      "insert into public.project_inquiries(id,user_id,data) values($1,null,$2)",
      [guest, brief],
    );
    await assert.rejects(
      db.query("select * from public.project_inquiries"),
      /permission denied/,
    );
    await as("authenticated", client);
    await db.query("select public.save_campaign_draft($1)", [
      JSON.stringify({ scope: "new", step: 3, form: { brand: "North" } }),
    ]);
    await db.query("select public.save_campaign_draft($1)", [
      JSON.stringify({ scope: "new", step: 4, form: { brand: "North" } }),
    ]);
    assert.deepEqual(
      (
        await db.query(
          "select data->>'step' as step from public.campaign_drafts",
        )
      ).rows,
      [{ step: "4" }],
    );
    const campaign = (
      await db.query(
        "insert into public.campaigns(user_id,data) values($1,$2) returning id",
        [
          client,
          JSON.stringify({
            brand: "North",
            calendar: [{ id: "first", date: "2027-01-01" }],
          }),
        ],
      )
    ).rows[0].id;
    const originalCalendar = [{ id: "first", date: "2027-01-01" }];
    const movedCalendar = [{ id: "first", date: "2027-01-02" }];
    await db.query("select public.update_campaign_calendar($1,$2,$3)", [
      campaign,
      JSON.stringify(originalCalendar),
      JSON.stringify(movedCalendar),
    ]);
    await assert.rejects(
      db.query("select public.update_campaign_calendar($1,$2,$3)", [
        campaign,
        JSON.stringify(originalCalendar),
        JSON.stringify(movedCalendar),
      ]),
      /Calendar changed/,
    );
    await as("authenticated", stranger);
    await assert.rejects(
      db.query("select public.update_campaign_calendar($1,$2,$3)", [
        campaign,
        JSON.stringify(movedCalendar),
        "[]",
      ]),
      /Campaign is unavailable/,
    );
    await as("authenticated", client);
    assert.equal(
      (
        await db.query(
          "select data->>'id' as entry from public.campaign_calendar where campaign_id=$1",
          [campaign],
        )
      ).rows[0].entry,
      "first",
    );
    await db.query("update public.campaigns set data=$1 where id=$2", [
      JSON.stringify({
        brand: "North",
        calendar: [{ id: "second", date: "2027-01-02" }],
      }),
      campaign,
    ]);
    assert.deepEqual(
      (
        await db.query(
          "select data->>'id' as entry from public.campaign_calendar",
        )
      ).rows,
      [{ entry: "second" }],
    );
    await assert.rejects(
      db.query("insert into public.notifications(user_id,data) values($1,$2)", [
        stranger,
        JSON.stringify({ message: "Unauthorized", read: false }),
      ]),
      /row-level security/,
    );
    await as("authenticated", stranger);
    for (const table of ["campaigns", "campaign_drafts", "campaign_calendar"]) {
      assert.equal(
        (await db.query("select id from public." + table)).rows.length,
        0,
      );
    }
    await as("authenticated", client);

    await assert.rejects(
      db.query("update public.profiles set role='admin' where id=$1", [client]),
      /permission denied/,
    );
    await db.query(
      "insert into public.project_inquiries(id,user_id,data) values($1,$2,$3)",
      [inquiry, client, brief],
    );
    await assert.rejects(
      db.query("select public.approve_inquiry($1)", [inquiry]),
      /Admin access required/,
    );
    await assert.rejects(
      db.query(
        "update public.project_inquiries set data=jsonb_set(data,'{status}','\"approved\"') where id=$1",
        [inquiry],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into public.project_inquiries(user_id,data) values($1,$2)",
        [client, JSON.stringify({ ...JSON.parse(brief), objective: "x" })],
      ),
      /check constraint/,
    );
    await as("authenticated", stranger);
    assert.equal(
      (await db.query("select id from public.project_inquiries")).rows.length,
      0,
    );
    await as("authenticated", admin);
    const project = (
      await db.query("select public.approve_inquiry($1) as id", [inquiry])
    ).rows[0].id;
    await assert.rejects(
      db.query("select public.approve_inquiry($1)", [inquiry]),
      /already been reviewed/,
    );
    await db.query(
      'update public.projects set data=data||\'{"progress":45,"status":"In progress"}\' where id=$1',
      [project],
    );
    await as("authenticated", client);
    const result = await db.query(
      "select data from public.projects where id=$1",
      [project],
    );
    assert.equal(result.rows[0].data.progress, 45);
    assert.equal(
      (await db.query("select id from public.notifications")).rows.length,
      2,
    );
    assert.equal(
      (await db.query("update public.projects set data='{}' returning id")).rows
        .length,
      0,
    );
    const booking = JSON.stringify({
      name: "Client",
      email: "client@example.test",
      purpose: "Discuss a brand launch",
      service: "Branding",
      date: "2099-01-05",
      time: "10:00",
      status: "booked",
    });
    const booked = (
      await db.query(
        "insert into public.consultation_bookings(user_id,data) values($1,$2) returning id",
        [client, booking],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "insert into public.consultation_bookings(user_id,data) values($1,$2)",
        [client, booking],
      ),
      /duplicate key/,
    );
    await as("anon");
    assert.deepEqual(
      (await db.query("select * from public.reserved_slots('2099-01-05')"))
        .rows,
      [{ slot: "10:00" }],
    );
    await as("authenticated", client);
    await db.query(
      "update public.consultation_bookings set data=jsonb_set(data,'{status}','\"cancelled\"') where id=$1",
      [booked],
    );
    await as("anon");
    assert.deepEqual(
      (await db.query("select * from public.reserved_slots('2099-01-05')"))
        .rows,
      [],
    );
  } finally {
    await db.close();
  }
});

test("Studio-only migration supports private brand kits on an existing profiles schema", async () => {
  const db = new PGlite();
  const owner = "10000000-0000-4000-8000-000000000001";
  const stranger = "10000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create publication supabase_realtime;
      create schema auth; grant usage on schema auth to authenticated;
      create table public.profiles(id uuid primary key,full_name text);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    `);
    await db.query(
      "insert into public.profiles values ($1,'Owner'),($2,'Stranger')",
      [owner, stranger],
    );
    const migration = await readFile(
      new URL(
        "../supabase/migrations/202611250001_studio_brand_kits.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    const created = await db.query(
      "insert into public.brand_kits(user_id,data) values($1,$2) returning id",
      [owner, JSON.stringify({ theme: "coast", tagline: "By the sea" })],
    );
    const id = created.rows[0].id;
    await db.query("update public.brand_kits set data = $2 where id = $1", [
      id,
      JSON.stringify({ theme: "dark" }),
    ]);
    assert.equal(
      (await db.query("select data from public.brand_kits")).rows[0].data.theme,
      "dark",
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      stranger,
    ]);
    assert.deepEqual(
      (await db.query("select data from public.brand_kits")).rows,
      [],
    );
    await assert.rejects(
      db.query("insert into public.brand_kits(user_id,data) values($1,'{}')", [
        owner,
      ]),
      /row-level security/,
    );
    assert.deepEqual(
      (
        await db.query(
          "delete from public.brand_kits where id = $1 returning id",
          [id],
        )
      ).rows,
      [],
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    assert.deepEqual(
      (
        await db.query(
          "delete from public.brand_kits where id = $1 returning id",
          [id],
        )
      ).rows,
      [{ id }],
    );
  } finally {
    await db.close();
  }
});

test("the calendar migration attaches to structured campaigns without replacing them", async () => {
  const db = new PGlite();
  const owner = "10000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table public.profiles(id uuid primary key,full_name text);
      create table public.campaigns(
        id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles,
        created_at timestamptz default now(), title text not null, brand_name text not null,
        description text, objective text, target_audience text, platform text[] not null default '{}',
        budget numeric, start_date date, end_date date
      );
      alter table public.campaigns enable row level security;
      create policy own_campaign on public.campaigns to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
      create function storage.extension(name text) returns text language sql as $$ select split_part(name,'.',2) $$;
    `);
    await db.query("insert into public.profiles values ($1,'Owner')", [owner]);
    await db.query(
      "insert into public.campaigns(user_id,title,brand_name,platform,start_date,end_date) values ($1,'Existing','North',array['Instagram'],'2030-12-01','2030-12-14')",
      [owner],
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611250002_campaign_calendar.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const existing = (
      await db.query("select data from public.campaigns where title='Existing'")
    ).rows[0].data;
    assert.equal(existing.duration, 14);
    assert.deepEqual(existing.channels, ["Instagram"]);
    const brief = {
      ...existing,
      title: "New campaign",
      channels: ["YouTube"],
      calendar: [{ id: "one", idea: "Owned entry" }],
    };
    const result = await db.query(
      "insert into public.campaigns(user_id,data) values ($1,$2) returning title,brand_name,platform",
      [owner, JSON.stringify(brief)],
    );
    assert.deepEqual(result.rows, [
      { title: "New campaign", brand_name: "North", platform: ["YouTube"] },
    ]);
    assert.deepEqual(
      (
        await db.query(
          "select data->>'idea' as title from public.campaign_calendar",
        )
      ).rows,
      [{ title: "Owned entry" }],
    );
  } finally {
    await db.close();
  }
});
