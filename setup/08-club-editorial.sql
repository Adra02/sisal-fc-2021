begin;
-- Additive: run after the existing database and account migrations.
alter table public.communications add column if not exists author_name text;
create table if not exists public.club_events (
 id bigint generated always as identity primary key,
 event_key text unique not null, kind text not null check(kind in ('news','paper','signup')),
 target text not null, title text not null, created_at timestamptz not null default now()
);
create table if not exists public.club_event_reads (
 account_id uuid references public.club_accounts(id) on delete cascade,
 event_id bigint references public.club_events(id) on delete cascade,
 primary key(account_id,event_id)
);
create table if not exists public.club_editions (
 id uuid primary key default gen_random_uuid(), fingerprint text unique not null,
 model jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.club_editorial_lock (
 singleton boolean primary key default true check(singleton), lease uuid,
 until_at timestamptz, attempted_at timestamptz
);
insert into club_editorial_lock(singleton) values(true) on conflict do nothing;
create or replace function public.sisal_editorial_event() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if TG_TABLE_NAME='communications' then
 insert into club_events(event_key,kind,target,title) values('news:'||new.id,'news',new.id::text,left(new.title,160)) on conflict do nothing;
 elsif TG_TABLE_NAME='club_accounts' then
 if new.status='pending' then
 insert into club_events(event_key,kind,target,title) values('signup:'||new.id,'signup',new.id::text,'Richiesta di '||new.display_name) on conflict do nothing;
 end if;
 else
 insert into club_events(event_key,kind,target,title) values('paper:'||new.id,'paper',new.id::text,new.model->>'title') on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists sisal_news_event on public.communications;
create trigger sisal_news_event after insert on public.communications for each row execute function public.sisal_editorial_event();
drop trigger if exists sisal_signup_event on public.club_accounts;
create trigger sisal_signup_event after insert on public.club_accounts for each row execute function public.sisal_editorial_event();
drop trigger if exists sisal_paper_event on public.club_editions;
create trigger sisal_paper_event after insert on public.club_editions for each row execute function public.sisal_editorial_event();
-- Pending applications already present remain discoverable, without duplicate events.
insert into club_events(event_key,kind,target,title)
select 'signup:'||id,'signup',id::text,'Richiesta di '||display_name from club_accounts where status='pending' on conflict do nothing;
create or replace function public.sisal_editorial(p_action text,p jsonb default '{}',p_session text default '') returns jsonb
language plpgsql security definer set search_path=public as $$
declare a club_accounts; result jsonb; e club_editions; l club_editorial_lock;
begin
 select u.* into a from club_accounts u join club_sessions s on s.account_id=u.id
 where s.token_hash=p_session and s.expires_at>now() and u.status='active';
 if not found then raise exception 'UNAUTHORIZED';end if;
 if p_action in ('notifications','read','read_all') then
 if p_action in ('read','read_all') then
 insert into club_event_reads(account_id,event_id)
 select a.id,v.id from club_events v
 where ((p_action='read' and v.id=(p->>'id')::bigint) or (p_action='read_all' and v.id<=(p->>'through')::bigint))
 and (v.kind<>'signup' or (a.is_admin and exists(select 1 from club_accounts u where u.id::text=v.target and u.status='pending')))
 on conflict do nothing;
 end if;
 with visible as (
 select v.*,r.event_id is not null as read from club_events v left join club_event_reads r on r.event_id=v.id and r.account_id=a.id
 where (v.kind<>'signup' or (a.is_admin and exists(select 1 from club_accounts u where u.id::text=v.target and u.status='pending')))
 and (v.kind<>'news' or exists(select 1 from communications c where c.id::text=v.target and not c.archived))
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(x order by x.id desc) from(select * from visible order by id desc limit 100)x),'[]'),
 'unread',(select count(*) from visible where not read),'through',coalesce((select max(id) from visible),0)) into result;
 return result;
 elsif p_action='latest' then
 select * into e from club_editions order by created_at desc,id desc limit 1;
 return jsonb_build_object('edition',case when e.id is null then null else to_jsonb(e) end);
 elsif p_action='edition' then
 select * into e from club_editions where id=(p->>'id')::uuid;
 return jsonb_build_object('edition',case when e.id is null then null else to_jsonb(e) end);
 end if;
 if not a.is_admin then raise exception 'FORBIDDEN';end if;
 if p_action='claim' then
 select * into l from club_editorial_lock where singleton for update;
 select * into e from club_editions where fingerprint=p->>'fingerprint';
 if found then return jsonb_build_object('edition',to_jsonb(e),'existing',true);end if;
 if l.until_at>now() then raise exception 'BUSY';end if;
 if l.attempted_at>now()-interval '60 seconds' then raise exception 'COOLDOWN';end if;
 update club_editorial_lock set lease=(p->>'lease')::uuid,until_at=now()+interval '120 seconds',attempted_at=now() where singleton;
 return jsonb_build_object('recent',coalesce((select jsonb_agg(x.model) from(select model from club_editions order by created_at desc limit 5)x),'[]'));
 elsif p_action='publish' then
 select * into l from club_editorial_lock where singleton for update;
 if l.lease is distinct from (p->>'lease')::uuid or l.until_at<now() then raise exception 'CONFLICT';end if;
 insert into club_editions(fingerprint,model) values(p->>'fingerprint',p->'model') on conflict(fingerprint) do nothing;
 update club_editorial_lock set lease=null,until_at=null where singleton;
 select * into e from club_editions where fingerprint=p->>'fingerprint';
 return jsonb_build_object('edition',to_jsonb(e));
 elsif p_action='release' then
 update club_editorial_lock set lease=null,until_at=null where singleton and lease=(p->>'lease')::uuid;
 return '{}';
 end if;
 raise exception 'INVALID_ACTION';
end $$;
-- A previous compatible client may submit only the old cosmetic fields.
-- Preserve the new personal choices rather than erasing them during rollback.
create or replace function public.sisal_style_compat() returns trigger
language plpgsql set search_path=public as $$
declare k text;
begin
 foreach k in array array['nickname','entrance','celebration','introduction'] loop
 if old.appearance ? k and not (new.appearance ? k) then
 new.appearance:=new.appearance||jsonb_build_object(k,old.appearance->k);
 end if;
 end loop;
 return new;
end $$;
drop trigger if exists sisal_style_compat on public.club_accounts;
create trigger sisal_style_compat before update of appearance on public.club_accounts for each row execute function public.sisal_style_compat();
revoke all on function public.sisal_style_compat() from public,anon,authenticated;
-- Keep the existing news RPC, receipts and reactions intact.
create or replace function public.sisal_news_actor(p jsonb,p_device uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a club_accounts; result jsonb;
begin
 select * into a from club_accounts where id=p_device and status='active';
 if not found then raise exception 'UNAUTHORIZED';end if;
 if p->>'action' not in ('list','get','like') and not a.is_admin then raise exception 'FORBIDDEN';end if;
 result:=sisal_news(p,p_device);
 if p->>'action'='create' then
 update communications set author_name=a.display_name where id=(p->>'id')::uuid and author_name is null;
 result:=result||jsonb_build_object('author_name',a.display_name);
 end if;
 return result;
end $$;
do $$ declare n text;begin
 foreach n in array array['club_events','club_event_reads','club_editions','club_editorial_lock'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from anon,authenticated',n);
 execute format('grant all on public.%I to service_role',n);
 end loop;
end $$;
revoke all on function public.sisal_editorial_event() from public,anon,authenticated;
revoke all on function public.sisal_editorial(text,jsonb,text) from public,anon,authenticated;
revoke all on function public.sisal_news_actor(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.sisal_editorial(text,jsonb,text) to service_role;
grant execute on function public.sisal_news_actor(jsonb,uuid) to service_role;
commit;
