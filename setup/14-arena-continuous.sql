begin;
-- A bounded, shared checkpoint, not positions written every frame.
-- The previous Arena tables and every account/statistic remain intact.
create table if not exists public.club_arena_live_sessions(
 epoch bigint primary key,
 payload jsonb,
 lease_id text,
 lease_until timestamptz,
 created_at timestamptz not null default now()
);
alter table public.club_arena_live_sessions enable row level security;
revoke all on public.club_arena_live_sessions from public,anon,authenticated;

-- Return only the nearest past checkpoint, never future results or the entire
-- checkpoint history. This also reduces Supabase egress on each spectator read.
create or replace function public.sisal_arena_view(snap jsonb, ts numeric) returns jsonb
language plpgsql immutable set search_path='' as $$
declare cp jsonb;
begin
 select value into cp from jsonb_array_elements(coalesce(snap->'checkpoints','[]'::jsonb))
 where (value->>'at')::numeric<=ts order by (value->>'at')::numeric desc limit 1;
 return jsonb_build_object('players',snap->'players','keeper',snap->'keeper','world',
  case when cp is null then snap->'world' else jsonb_build_object('version',6,'startAt',cp->'at','start',cp->'state') end);
end $$;
revoke all on function public.sisal_arena_view(jsonb,numeric) from public,anon,authenticated;

create or replace function public.sisal_arena_live(p_action text,p_session text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.club_accounts; e bigint; ts numeric; snap jsonb; prior jsonb; row_state public.club_arena_live_sessions; excluded_keys jsonb:='[]'; claim text;
begin
 select u.* into a from public.club_sessions s join public.club_accounts u on u.id=s.account_id
 where s.token_hash=p_session and s.expires_at>now() and u.status='active';
 if not found then raise exception 'UNAUTHORIZED';end if;
 ts=extract(epoch from clock_timestamp())*1000;e=floor(ts/1800000);
 if p_action='get' then
  select payload into snap from public.club_arena_live_sessions where epoch=e;
  if snap is not null then return jsonb_build_object('snapshot',public.sisal_arena_view(snap,ts),'epoch',e,'serverNow',ts,'version',3);end if;
  claim=p->>'claim';
  if claim is null or length(claim)<20 or length(claim)>80 then raise exception 'INVALID_ACTION';end if;
  perform pg_advisory_xact_lock(328794,2714);
  select * into row_state from public.club_arena_live_sessions where epoch=e;
  if row_state.payload is not null then return jsonb_build_object('snapshot',public.sisal_arena_view(row_state.payload,ts),'epoch',e,'serverNow',ts,'version',3);end if;
  if row_state.lease_until is not null and row_state.lease_until>clock_timestamp() then
   return jsonb_build_object('pending',true,'epoch',e,'serverNow',ts,'version',3,'retryAfterMs',2400);
  end if;
  insert into public.club_arena_live_sessions(epoch,lease_id,lease_until) values(e,claim,clock_timestamp()+interval '75 seconds')
  on conflict(epoch) do update set lease_id=excluded.lease_id,lease_until=excluded.lease_until where club_arena_live_sessions.payload is null;
  select payload into prior from public.club_arena_live_sessions where epoch<e and payload is not null order by epoch desc limit 1;
  if to_regclass('public.club_excluded_players') is not null then
   execute 'select coalesce(jsonb_agg(player_key),''[]''::jsonb) from public.club_excluded_players' into excluded_keys;
  end if;
  return jsonb_build_object('epoch',e,'serverNow',ts,'version',3,'claim',claim,'previous',prior,
   'source',(select files->'players' from public.team_state where role='own'),
   'accounts',coalesce((select jsonb_agg(jsonb_build_object('key',player_key,'name',display_name,'appearance',appearance)) from public.club_accounts where status='active'),'[]'),
   'excluded',excluded_keys,'keeper',(select keeper from public.club_arena_settings where singleton));
 elsif p_action='publish' then
  if (p->>'epoch')::bigint is distinct from e then raise exception 'CONFLICT';end if;
  if jsonb_typeof(p->'snapshot') is distinct from 'object'
     or jsonb_typeof(p->'snapshot'->'players') is distinct from 'array'
     or jsonb_array_length(p->'snapshot'->'players')>128
     or (p->'snapshot'->'world'->>'version')::integer is distinct from 6
     or jsonb_typeof(p->'snapshot'->'world'->'start') is distinct from 'object'
     or jsonb_typeof(p->'snapshot'->'end') is distinct from 'object'
     or octet_length((p->'snapshot')::text)>1500000 then raise exception 'INVALID_ACTION';end if;
  perform pg_advisory_xact_lock(328794,2714);
  select * into row_state from public.club_arena_live_sessions where epoch=e;
  if row_state.payload is not null then return jsonb_build_object('snapshot',public.sisal_arena_view(row_state.payload,ts),'epoch',e,'serverNow',ts,'version',3);end if;
  if row_state.lease_id is distinct from p->>'claim' then raise exception 'CONFLICT';end if;
  update public.club_arena_live_sessions set payload=p->'snapshot',lease_id=null,lease_until=null,created_at=now() where epoch=e;
  delete from public.club_arena_live_sessions where epoch<e-2;
  return jsonb_build_object('snapshot',public.sisal_arena_view(p->'snapshot',extract(epoch from clock_timestamp())*1000),'epoch',e,'serverNow',extract(epoch from clock_timestamp())*1000,'version',3);
 elsif p_action='release' then
  update public.club_arena_live_sessions set lease_id=null,lease_until=null where epoch=e and payload is null and lease_id=p->>'claim';
  return jsonb_build_object('ok',true);
 else raise exception 'INVALID_ACTION';end if;
end $$;
revoke all on function public.sisal_arena_live(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.sisal_arena_live(text,text,jsonb) to service_role;
commit;
