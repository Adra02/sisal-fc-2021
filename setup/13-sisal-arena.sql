begin;
-- Small shared snapshots, no positions, frames, chat logs or user tracking.
create table if not exists public.club_arena_settings(singleton boolean primary key default true check(singleton),keeper text);
insert into public.club_arena_settings(singleton) values(true) on conflict do nothing;
create table if not exists public.club_arena_sessions(epoch bigint primary key,version integer not null,payload jsonb not null,created_at timestamptz not null default now());
alter table public.club_arena_settings enable row level security;
alter table public.club_arena_sessions enable row level security;
revoke all on public.club_arena_settings,public.club_arena_sessions from public,anon,authenticated;
create or replace function public.sisal_arena(p_action text,p_session text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.club_accounts; e bigint; snap jsonb; ts numeric; keeper_key text; excluded jsonb:='[]';
begin
 select u.* into a from public.club_sessions s join public.club_accounts u on u.id=s.account_id
 where s.token_hash=p_session and s.expires_at>now() and u.status='active';
 if not found then raise exception 'UNAUTHORIZED';end if;
 ts=extract(epoch from clock_timestamp())*1000;e=floor(ts/1800000);
 if p_action='keeper' then
  if not a.is_admin then raise exception 'FORBIDDEN';end if;
  keeper_key=nullif(p->>'key','');
  if keeper_key is not null and not exists(select 1 from public.club_accounts where player_key=keeper_key and status='active') then raise exception 'PLAYER';end if;
  update public.club_arena_settings set keeper=keeper_key where singleton;
  return jsonb_build_object('ok',true,'effectiveAt',(e+1)*1800000);
 elsif p_action='get' or p_action='publish' then
  if p_action='publish' then
   if (p->>'epoch')::bigint is distinct from e or (p->>'version')::integer is distinct from 2 then raise exception 'CONFLICT';end if;
   if jsonb_typeof(p->'players') is distinct from 'array' or jsonb_array_length(p->'players')>128 then raise exception 'INVALID_STYLE';end if;
   perform pg_advisory_xact_lock(328794,2713);
   insert into public.club_arena_sessions(epoch,version,payload) values(e,2,jsonb_build_object('players',p->'players','keeper',p->'keeper')) on conflict(epoch) do update set version=excluded.version,payload=excluded.payload,created_at=now() where club_arena_sessions.version<>2;
   delete from public.club_arena_sessions where epoch<e-2;
  end if;
  select payload into snap from public.club_arena_sessions where epoch=e and version=2;
  if snap is not null then return jsonb_build_object('snapshot',snap,'epoch',e,'serverNow',ts,'version',2);end if;
  if to_regclass('public.club_excluded_players') is not null then
   execute 'select coalesce(jsonb_agg(player_key),''[]''::jsonb) from public.club_excluded_players' into excluded;
  end if;
  return jsonb_build_object('epoch',e,'serverNow',ts,'version',2,'source',
   (select files->'players' from public.team_state where role='own'),
   'accounts',coalesce((select jsonb_agg(jsonb_build_object('key',player_key,'name',display_name,'appearance',appearance)) from public.club_accounts where status='active'),'[]'),
   'excluded',excluded,
   'keeper',(select keeper from public.club_arena_settings where singleton));
 else raise exception 'INVALID_ACTION';end if;
end $$;
revoke all on function public.sisal_arena(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.sisal_arena(text,text,jsonb) to service_role;
-- Backward-compatible cosmetic preference: no account or statistic is removed.
create or replace function public.sisal_style_compat() returns trigger
language plpgsql set search_path='' as $$
declare k text;
begin
 foreach k in array array['nickname','entrance','celebration','introduction','helmetVisible','skin','face','jaw','cheeks','nose','ears','eyes','eyeShape','brow','browWeight','mouth','lips','expression','hair','hairColor','hairTexture','hairPart','beard','beardColor','freckles','wrinkles','scar','beautyMark','goggles'] loop
  if old.appearance ? k and not (new.appearance ? k) then
   new.appearance:=new.appearance||jsonb_build_object(k,old.appearance->k);
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.sisal_style_compat() from public,anon,authenticated;
commit;
