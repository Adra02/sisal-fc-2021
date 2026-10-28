begin;
-- Additive upgrade after 08-club-editorial.sql. No club/account/source rows are deleted.
-- Authenticated uploads drive this queue: no cron, pg_net or browser polling.
create table if not exists public.club_paper_queue53 (
 singleton boolean primary key default true check(singleton),
 fingerprint text, generation bigint not null default 0,
 actor_id uuid references public.club_accounts(id) on delete set null,
 due_at timestamptz, completed_at timestamptz, last_error text, attempted_at timestamptz
);
insert into public.club_paper_queue53(singleton) values(true) on conflict do nothing;
alter table public.club_paper_queue53 enable row level security;
revoke all on public.club_paper_queue53 from public,anon,authenticated;
grant all on public.club_paper_queue53 to service_role;

-- Ignore upload dates, file names, recognition metadata and object-key ordering.
create or replace function public.sisal_paper53_source(p_files jsonb) returns jsonb
language plpgsql immutable set search_path=public as $$
declare k text; v jsonb; result jsonb:='{}';
begin
 for k,v in select key,value from jsonb_each(coalesce(p_files,'{}')) loop
  v:=coalesce(nullif(v->'raw','null'),v->'parsed','null');
  if jsonb_typeof(v)='string' then
   begin v:=(v#>>'{}')::jsonb; exception when others then null; end;
  end if;
  result:=result||jsonb_build_object(k,v);
 end loop;
 return result;
end $$;
create or replace function public.sisal_paper53(p_action text,p_actor uuid default null,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare q club_paper_queue53; l club_editorial_lock; e club_editions;
 t team_state; fp text; n timestamptz:=clock_timestamp();
begin
 if p_action='status' then
  select * into q from club_paper_queue53 where singleton;
  select * into l from club_editorial_lock where singleton;
  return jsonb_build_object('pending',q.due_at is not null and q.completed_at is null and q.last_error is null,
   'working',l.until_at>n,'error',coalesce(q.last_error,case when q.completed_at is null and q.due_at<n-interval '3 minutes' and (l.until_at is null or l.until_at<n) then 'INTERRUPTED' end),'attemptedAt',q.attempted_at);
 end if;
 if not exists(select 1 from club_accounts where id=p_actor and status='active' and is_admin) then raise exception 'FORBIDDEN';end if;
 -- Same lock order as source uploads: source -> editorial lease -> queue.
 select * into t from team_state where role='own' for share;
 fp:=md5('sisal-front-page-v1:'||sisal_paper53_source(t.files)::text);
 select * into l from club_editorial_lock where singleton for update;
 select * into q from club_paper_queue53 where singleton for update;
 if p_action='enqueue' then
  if t.files='{}' then return jsonb_build_object('skipped',true);end if;
  if q.fingerprint is not distinct from fp then
   if q.completed_at is null and q.last_error is null then
    return jsonb_build_object('queued',true,'generation',q.generation,'delayMs',20050);
   end if;
   return jsonb_build_object('skipped',true,'unchanged',true,'generation',q.generation);
  end if;
  update club_paper_queue53 set fingerprint=fp,generation=generation+1,actor_id=p_actor,
   due_at=n+interval '20 seconds',completed_at=null,last_error=null where singleton returning * into q;
  if exists(select 1 from club_editions where fingerprint=fp) then
   update club_paper_queue53 set completed_at=n,due_at=null where singleton;
   return jsonb_build_object('skipped',true,'existing',true);
  end if;
  return jsonb_build_object('queued',true,'generation',q.generation,'delayMs',20050);
 elsif p_action='claim' then
  if coalesce((p->>'automatic')::boolean,false) then
   if q.generation is distinct from (p->>'generation')::bigint or q.fingerprint is distinct from fp
    or q.completed_at is not null or q.last_error is not null then return jsonb_build_object('skipped',true);end if;
   if q.due_at>n then return jsonb_build_object('pending',true,'retryAfterMs',ceil(extract(epoch from q.due_at-n)*1000)+50);end if;
  end if;
  select * into e from club_editions where fingerprint=fp;
  if found then
   update club_paper_queue53 set completed_at=n,due_at=null,last_error=null where singleton;
   return jsonb_build_object('edition',to_jsonb(e),'existing',true);
  end if;
  if l.until_at>n then return jsonb_build_object('pending',true,'retryAfterMs',5000);end if;
  if not coalesce((p->>'automatic')::boolean,false) and l.attempted_at>n-interval '60 seconds' then raise exception 'COOLDOWN';end if;
  update club_editorial_lock set lease=(p->>'lease')::uuid,until_at=n+interval '100 seconds',attempted_at=n where singleton;
  update club_paper_queue53 set attempted_at=n,last_error=null,fingerprint=fp,actor_id=p_actor,
   completed_at=null,due_at=coalesce(due_at,n),generation=generation+case when fingerprint is distinct from fp then 1 else 0 end where singleton;
  return jsonb_build_object('fingerprint',fp,'files',t.files,'revision',t.revision,
   'recent',coalesce((select jsonb_agg(x.model) from(select model from club_editions order by created_at desc,id desc limit 5)x),'[]'));
 elsif p_action='publish' then
  if l.lease is distinct from (p->>'lease')::uuid or l.until_at<n then raise exception 'CONFLICT';end if;
  if fp is distinct from p->>'fingerprint' then raise exception 'DATA_CHANGED';end if;
  if (p->'model'->>'schemaVersion') is distinct from '3' or jsonb_typeof(p->'model'->'stories') is distinct from 'array'
   or jsonb_array_length(p->'model'->'stories') not between 2 and 4
   or length(p->'model'->>'title') not between 8 and 130 then raise exception 'INVALID_EDITION';end if;
  insert into club_editions(fingerprint,model) values(fp,p->'model') on conflict(fingerprint) do nothing;
  select * into e from club_editions where fingerprint=fp;
  update club_editorial_lock set lease=null,until_at=null where singleton;
  update club_paper_queue53 set fingerprint=fp,completed_at=n,due_at=null,last_error=null where singleton;
  return jsonb_build_object('edition',to_jsonb(e));
 elsif p_action='release' then
  if l.lease is not distinct from (p->>'lease')::uuid then
   update club_editorial_lock set lease=null,until_at=null where singleton;
   if q.fingerprint is not distinct from p->>'fingerprint' then
    update club_paper_queue53 set last_error=nullif(left(p->>'error',80),'') where singleton;
   end if;
  end if;
  return '{}';
 end if;
 raise exception 'INVALID_ACTION';
end $$;
revoke all on function public.sisal_paper53_source(jsonb) from public,anon,authenticated;
revoke all on function public.sisal_paper53(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.sisal_paper53(text,uuid,jsonb) to service_role;
commit;
