begin;
create table if not exists public.team_state (
 role text primary key check(role in ('own','opponent')),
 files jsonb not null default '{}', totals jsonb,
 memory jsonb not null default '{"schemaVersion":1,"snapshots":[]}',
 revision bigint not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.team_state(role) values('own'),('opponent') on conflict do nothing;
create table if not exists public.communications (
 id uuid primary key, title text not null check(length(title) between 1 and 160),
 body text not null check(length(body) between 1 and 18000), image_path text,
 pinned boolean not null default false, archived boolean not null default false,
 revision bigint not null default 1, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists communications_listing on public.communications(archived,pinned desc,created_at desc,id);
create unique index if not exists communications_one_pin on public.communications(pinned) where pinned;
create table if not exists public.communication_reactions (
 communication_id uuid not null references public.communications(id) on delete cascade,
 device_id uuid not null, created_at timestamptz not null default now(),primary key(communication_id,device_id)
);
create table if not exists public.player_photos (
 player_key text primary key, record jsonb not null, image_path text,
 revision bigint not null default 1, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.sisal_requests (
 device_id uuid not null, request_id uuid not null, payload jsonb not null,result jsonb not null,
 created_at timestamptz not null default now(),primary key(device_id,request_id)
);
create index if not exists sisal_requests_expiry on public.sisal_requests(created_at);
create or replace function public.sisal_team_read(p_role text) returns jsonb language sql security definer set search_path=public as $$
 select to_jsonb(t) from team_state t where role=p_role;
$$;
create or replace function public.sisal_team_write(p_role text,p_kind text,p_value jsonb,p_category text,p_revision bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t team_state; merged jsonb;
begin
 select * into strict t from team_state where role=p_role for update;
 if t.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if p_kind='file' then
  if not p_category=any(array['totals','season','clubInfo','overallStats','players','career','league','playoffs','friendlies','playoffAchievements']) then raise exception 'INVALID_CATEGORY';end if;
  if t.files->p_category=p_value then return to_jsonb(t);end if;
  t.files=jsonb_set(t.files,array[p_category],p_value,true);
 elsif p_kind='totals' then t.totals=p_value;
 elsif p_kind='memory' then
  -- Merge by fingerprint in the same row transaction. Never discard another writer's history.
  select coalesce(jsonb_agg(s order by pos),'[]') into merged from (
   select * from (
    select distinct on (s->>'fingerprint') s,pos
    from jsonb_array_elements(coalesce(p_value->'snapshots','[]')||coalesce(t.memory->'snapshots','[]')) with ordinality a(s,pos)
    order by s->>'fingerprint',pos
   ) unique_snapshots order by pos limit 20
  ) x;
  t.memory=jsonb_build_object('schemaVersion',1,'snapshots',merged);
 elsif p_kind='delete' then t.files='{}';t.totals=null;t.memory='{"schemaVersion":1,"snapshots":[]}';
 else raise exception 'INVALID_ACTION';end if;
 update team_state set files=t.files,totals=t.totals,memory=t.memory,revision=revision+1,updated_at=now() where role=p_role returning * into t;
 return to_jsonb(t);
end $$;
create or replace function public.sisal_news_summary(p_id uuid,p_device uuid) returns jsonb language sql security definer set search_path=public as $$
 select (to_jsonb(c)-'body'-'image_path')||jsonb_build_object('excerpt',left(c.body,240),'has_image',c.image_path is not null,
 'likes',(select count(*) from communication_reactions r where r.communication_id=c.id),
 'liked',exists(select 1 from communication_reactions r where r.communication_id=c.id and r.device_id=p_device)) from communications c where id=p_id;
$$;
create or replace function public.sisal_news(p jsonb,p_device uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare a text=p->>'action'; pid uuid=(p->>'id')::uuid; req uuid=(p->>'request_id')::uuid;
 c communications; receipt sisal_requests; result jsonb; v boolean=coalesce((p->>'value')::boolean,false);
begin
 if a='list' then
  select jsonb_build_object('posts',coalesce(jsonb_agg(sisal_news_summary(id,p_device) order by pinned desc,created_at desc,id desc),'[]'),
   'total',(select count(*) from communications where archived=coalesce((p->>'archived')::boolean,false)),'fetched_at',now()) into result
  from (select id,pinned,created_at from communications where archived=coalesce((p->>'archived')::boolean,false) order by pinned desc,created_at desc,id desc limit 20 offset coalesce((p->>'offset')::int,0)) t;
  return result;
 end if;
 if a='get' then
  select * into c from communications where id=pid;if not found then raise exception 'NOT_FOUND';end if;
  return sisal_news_summary(pid,p_device)||jsonb_build_object('body',c.body,'image_path',c.image_path);
 end if;
 -- All mutations are short DB transactions; this also serializes pin and receipt/rate checks.
 perform pg_advisory_xact_lock(2021,27);
 select * into receipt from sisal_requests where device_id=p_device and request_id=req;
 if found then if receipt.payload<>p then raise exception 'CONFLICT';end if; return receipt.result;end if;
 if (select count(*) from sisal_requests where device_id=p_device and created_at>now()-interval '1 minute')>=15 then raise exception 'RATE_LIMIT';end if;
 if (select count(*) from sisal_requests where created_at>now()-interval '1 day')>=1000 then raise exception 'DAILY_LIMIT';end if;
 select * into c from communications where id=pid for update;
 if a='create' then
  if found then raise exception 'CONFLICT';end if;
  if (select count(*) from communications)>=100 then raise exception 'POST_LIMIT';end if;
 else
  if not found then raise exception 'NOT_FOUND';end if;
  if a in ('edit','pin','archive','delete') and c.revision<>(p->>'revision')::bigint then raise exception 'CONFLICT';end if;
 end if;
 if (a in ('create','edit') and coalesce((p->>'pinned')::boolean,false)) or (a='pin' and v) then
  if c.archived then raise exception 'ARCHIVED';end if;
  update communications set pinned=false,revision=revision+1 where pinned and id<>pid;
 end if;
 if a='create' then
  insert into communications(id,title,body,image_path,pinned) values(pid,p->>'title',p->>'body',p->>'image_path',coalesce((p->>'pinned')::boolean,false));
 elsif a='edit' then
  update communications set title=p->>'title',body=p->>'body',image_path=p->>'image_path',pinned=coalesce((p->>'pinned')::boolean,false) and not archived,updated_at=now(),revision=revision+1 where id=pid;
 elsif a='like' then
  if v then insert into communication_reactions(communication_id,device_id) values(pid,p_device) on conflict do nothing;
  else delete from communication_reactions where communication_id=pid and device_id=p_device;end if;
 elsif a='pin' then update communications set pinned=v,revision=revision+1 where id=pid;
 elsif a='archive' then update communications set archived=v,pinned=false,revision=revision+1 where id=pid;
 elsif a='delete' then delete from communications where id=pid;
 else raise exception 'INVALID_ACTION';end if;
 result=case when a='delete' then jsonb_build_object('deleted',pid) else sisal_news_summary(pid,p_device) end;
 insert into sisal_requests(device_id,request_id,payload,result) values(p_device,req,p,result);
 delete from sisal_requests where created_at<now()-interval '7 days';
 return result;
end $$;
create or replace function public.sisal_photo_write(p_key text,p_record jsonb,p_path text,p_revision bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare r player_photos;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 select * into r from player_photos where player_key=p_key;
 if coalesce(r.revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 insert into player_photos(player_key,record,image_path) values(p_key,p_record,p_path)
 on conflict(player_key) do update set record=excluded.record,image_path=excluded.image_path,revision=player_photos.revision+1,updated_at=now() returning * into r;
 return to_jsonb(r);
end $$;
-- No direct browser access, including with the public publishable/anon key.
alter table public.team_state enable row level security;
alter table public.communications enable row level security;
alter table public.communication_reactions enable row level security;
alter table public.player_photos enable row level security;
alter table public.sisal_requests enable row level security;
revoke all on public.team_state,public.communications,public.communication_reactions,public.player_photos,public.sisal_requests from anon,authenticated;
grant all on public.team_state,public.communications,public.communication_reactions,public.player_photos,public.sisal_requests to service_role;
revoke all on function public.sisal_team_read(text),public.sisal_team_write(text,text,jsonb,text,bigint),public.sisal_news_summary(uuid,uuid),public.sisal_news(jsonb,uuid),public.sisal_photo_write(text,jsonb,text,bigint) from public,anon,authenticated;
grant execute on function public.sisal_team_read(text),public.sisal_team_write(text,text,jsonb,text,bigint),public.sisal_news_summary(uuid,uuid),public.sisal_news(jsonb,uuid),public.sisal_photo_write(text,jsonb,text,bigint) to service_role;
commit;
