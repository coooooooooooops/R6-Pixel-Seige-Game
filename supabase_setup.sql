-- R6 Pixel Siege: account backend. Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run more than once.

-- 1. One row per player ---------------------------------------------------------------
create table if not exists public.player_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text,
  settings   jsonb not null default '{}'::jsonb,   -- game settings
  binds      jsonb not null default '{}'::jsonb,   -- key bindings
  loadouts   jsonb not null default '{}'::jsonb,   -- saved loadouts + favourite operators
  economy    jsonb not null default '{}'::jsonb,   -- credits, owned items, equipped cosmetics, packs, season pass
  stats      jsonb not null default '{}'::jsonb,   -- kills, deaths, wins ... (server-side only, see add_stats)
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,16}$')
);
create unique index if not exists player_data_username_lower on public.player_data (lower(username));

-- (if you already ran an earlier version of this file, this adds the new column)
alter table public.player_data add column if not exists economy jsonb not null default '{}'::jsonb;

-- 2. Row level security: a player can only see and change their own row -----------------
alter table public.player_data enable row level security;
drop policy if exists "own row select" on public.player_data;
drop policy if exists "own row insert" on public.player_data;
drop policy if exists "own row update" on public.player_data;
create policy "own row select" on public.player_data for select to authenticated using (auth.uid() = user_id);
create policy "own row insert" on public.player_data for insert to authenticated with check (auth.uid() = user_id);
create policy "own row update" on public.player_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Column permissions: the game can write everything EXCEPT stats directly -----------
revoke all on public.player_data from anon, authenticated;
grant select on public.player_data to authenticated;
grant insert (user_id, username, settings, binds, loadouts, economy, updated_at) on public.player_data to authenticated;
grant update (username, settings, binds, loadouts, economy, updated_at) on public.player_data to authenticated;

-- 4. Stats can only go up, in small steps, through this function ------------------------
create or replace function public.add_stats(delta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  k    text;
  v    numeric;
  cap  numeric;
  cur  jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(delta) <> 'object' then raise exception 'bad delta'; end if;

  insert into public.player_data (user_id) values (uid) on conflict (user_id) do nothing;
  select stats into cur from public.player_data where user_id = uid for update;
  cur := coalesce(cur, '{}'::jsonb);

  for k in select jsonb_object_keys(delta) loop
    cap := case k
      when 'kills' then 60 when 'deaths' then 10 when 'rounds' then 10 when 'round_wins' then 10
      when 'matches' then 5 when 'wins' then 5 when 'losses' then 5 when 'damage' then 20000
      else null end;
    if cap is null then continue; end if;                      -- ignore unknown keys
    v := coalesce((delta->>k)::numeric, 0);
    v := greatest(0, least(v, cap));                            -- no negatives, capped per call
    cur := jsonb_set(cur, array[k], to_jsonb(coalesce((cur->>k)::numeric, 0) + v));
  end loop;

  update public.player_data set stats = cur, updated_at = now() where user_id = uid;
  return cur;
end $$;
revoke all on function public.add_stats(jsonb) from public, anon;
grant execute on function public.add_stats(jsonb) to authenticated;

-- 5. Username check used by the sign-up form (works before you are signed in) -----------
create or replace function public.username_available(name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from public.player_data where lower(username) = lower(name));
$$;
grant execute on function public.username_available(text) to anon, authenticated;
