-- Existing account migration recovered from Sisal_Giornale_Atelier_COMPLETO.zip (16 October 2026). Local regression fixture only.
begin;
-- Deleting an account never modifies team_state, photos, match statistics or communications.
create table if not exists public.club_excluded_players(player_key text primary key,display_name text not null,created_at timestamptz not null default now());
alter table public.club_excluded_players enable row level security;
revoke all on public.club_excluded_players from public,anon,authenticated;
create or replace function public.sisal_registration_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from club_excluded_players where player_key=new.player_key) then raise exception 'PLAYER';end if;
 return new;
end $$;
drop trigger if exists sisal_registration_guard on public.club_accounts;
create trigger sisal_registration_guard before insert on public.club_accounts for each row execute function public.sisal_registration_guard();
create or replace function public.sisal_excluded_keys() returns jsonb language sql security definer set search_path=public as $$
 select coalesce(jsonb_agg(player_key),'[]') from club_excluded_players;
$$;
revoke all on function public.sisal_registration_guard(),public.sisal_excluded_keys() from public,anon,authenticated;
grant execute on function public.sisal_excluded_keys() to service_role;
create or replace function public.sisal_account(p_action text,p jsonb default '{}',p_session text default '') returns jsonb
language plpgsql security definer set search_path=public as $$
declare a club_accounts; t club_accounts; result jsonb; tid uuid; sid text;
begin
 -- Serialize account lifecycle changes, including last-admin checks and recovery.
 perform pg_advisory_xact_lock(328794,2701);
 delete from club_sessions where expires_at<now();
 delete from club_reset_tokens where expires_at<now();
 delete from club_account_audit where created_at<now()-interval '180 days';
 if p_action='directory' then
  return jsonb_build_object('accounts',coalesce((select jsonb_agg(jsonb_build_object('key',player_key,'name',display_name,'status',status)) from club_accounts),'[]'), 'hasOwner',exists(select 1 from club_accounts where is_owner));
 elsif p_action='credentials' then
  select * into a from club_accounts where player_key=p->>'key';
  if not found then return null;end if;
  return jsonb_build_object('id',a.id,'hash',a.password_hash,'version',a.version,'status',a.status);
 elsif p_action='register' or p_action='bootstrap' then
  if p_action='bootstrap' and exists(select 1 from club_accounts where is_owner) then raise exception 'ALREADY_SETUP';end if;
  insert into club_accounts(player_key,display_name,password_hash,status,is_admin,is_owner)
  values(p->>'key',p->>'name',p->>'hash',case when p_action='bootstrap' then 'active' else 'pending' end,p_action='bootstrap',p_action='bootstrap') returning * into a;
  insert into club_account_audit(actor,target,action) values(a.id,a.id,p_action);
  return jsonb_build_object('ok',true,'status',a.status);
 elsif p_action='login' then
  select * into a from club_accounts where id=(p->>'id')::uuid and version=(p->>'version')::integer and password_hash=p->>'hash';
  if not found then raise exception 'INVALID_LOGIN';end if;
  if a.status<>'active' then raise exception 'INACTIVE';end if;
  -- At most ten devices per account. Oldest is retired on the next sign-in.
  delete from club_sessions where token_hash in(select token_hash from club_sessions where account_id=a.id order by created_at desc offset 9);
  insert into club_sessions(token_hash,account_id,label) values(p->>'token',a.id,left(p->>'label',100));
 elsif p_action='reset' then
  select account_id into tid from club_reset_tokens where token_hash=p->>'token' and expires_at>now();
  if tid is null then raise exception 'INVALID_RESET';end if;
  select * into a from club_accounts where id=tid;
  if a.status<>'active' then raise exception 'INACTIVE';end if;
  update club_accounts set password_hash=p->>'hash',version=version+1 where id=tid;
  delete from club_sessions where account_id=tid;
  delete from club_import_tokens where account_id=tid;
  delete from club_reset_tokens where account_id=tid;
  insert into club_account_audit(target,action) values(tid,'password_reset');
  return jsonb_build_object('ok',true);
 elsif p_action='import_auth' then
  select u.* into a from club_accounts u join club_import_tokens s on s.account_id=u.id where s.token_hash=p_session and u.status='active' and u.is_admin;
  if not found then raise exception 'UNAUTHORIZED';end if;
  return jsonb_build_object('id',a.id,'is_admin',true,'importer',true);
 else
  select u.* into a from club_accounts u join club_sessions s on s.account_id=u.id where s.token_hash=p_session and s.expires_at>now() and u.status='active';
  if not found then raise exception 'UNAUTHORIZED';end if;
 end if;
 if p_action in ('login','session') then
  return to_jsonb(a)-'password_hash';
 elsif p_action='logout' then
  delete from club_sessions where token_hash=p_session;
 elsif p_action='logout_all' then
  delete from club_sessions where account_id=a.id;
 elsif p_action='appearance' then
  if a.appearance_revision<>(p->>'revision')::integer then raise exception 'CONFLICT';end if;
  update club_accounts set appearance=p->'appearance',appearance_revision=appearance_revision+1 where id=a.id returning * into a;
  return to_jsonb(a)-'password_hash';
 elsif p_action='lineup_exclusions' then
  return coalesce((select jsonb_agg(player_key) from club_excluded_players),'[]');
 elsif p_action='appearances' then
  return coalesce((select jsonb_object_agg(player_key,appearance) from club_accounts where status='active'),'{}');
 elsif p_action='password' then
  if a.version<>(p->>'version')::integer then raise exception 'CONFLICT';end if;
  update club_accounts set password_hash=p->>'hash',version=version+1 where id=a.id;
  delete from club_sessions where account_id=a.id;
  delete from club_reset_tokens where account_id=a.id;
  delete from club_import_tokens where account_id=a.id;
 elsif p_action='admin_list' then
  if not a.is_admin then raise exception 'FORBIDDEN';end if;
  return jsonb_build_object('accounts',coalesce((select jsonb_agg(to_jsonb(u)-'password_hash') from club_accounts u),'[]'),
   'excluded',coalesce((select jsonb_agg(jsonb_build_object('key',player_key,'name',display_name)) from club_excluded_players),'[]'),
   'audit',coalesce((select jsonb_agg(x) from(select * from club_account_audit order by id desc limit 50)x),'[]'));
 elsif p_action='delete_account' then
  if not a.is_admin then raise exception 'FORBIDDEN';end if;
  select * into t from club_accounts where id=(p->>'id')::uuid for update;
  if not found then raise exception 'NOT_FOUND';end if;
  if t.is_owner then raise exception 'OWNER_PROTECTED';end if;
  if t.is_admin and t.status='active' and (select count(*) from club_accounts where is_admin and status='active')<=1 then raise exception 'LAST_ADMIN';end if;
  insert into club_excluded_players(player_key,display_name) values(t.player_key,t.display_name) on conflict(player_key) do update set display_name=excluded.display_name;
  insert into club_account_audit(actor,target,action) values(a.id,t.id,'delete_account');
  delete from club_accounts where id=t.id;
 elsif p_action='allow_registration' then
  if not a.is_admin then raise exception 'FORBIDDEN';end if;
  delete from club_excluded_players where player_key=p->>'key';
  insert into club_account_audit(actor,action) values(a.id,'allow_registration');
 elsif p_action='import_token' then
  if not a.is_admin then raise exception 'FORBIDDEN';end if;
  delete from club_import_tokens where account_id=a.id;
  insert into club_import_tokens(token_hash,account_id) values(p->>'token',a.id);
 elsif p_action='revoke_import' then
  if not a.is_admin then raise exception 'FORBIDDEN';end if;
  delete from club_import_tokens where account_id=a.id;
 elsif p_action in ('approve','suspend','reactivate','promote','demote','reject','reset_token') then
  if not a.is_admin then raise exception 'FORBIDDEN';end if;
  select * into t from club_accounts where id=(p->>'id')::uuid;
  if not found then raise exception 'NOT_FOUND';end if;
  -- The founding owner cannot be changed by another administrator.
  if t.is_owner and (p_action<>'reset_token' or a.id=t.id) then raise exception 'OWNER_PROTECTED';end if;
  if p_action in ('suspend','demote','reject') and t.is_admin and t.status='active' and (select count(*) from club_accounts where is_admin and status='active')<=1 then raise exception 'LAST_ADMIN';end if;
  if p_action='approve' then
   if t.status<>'pending' then raise exception 'CONFLICT';end if;
   update club_accounts set status='active' where id=t.id;
  elsif p_action='reject' then
   if t.status<>'pending' then raise exception 'CONFLICT';end if;
   delete from club_accounts where id=t.id;
  elsif p_action='suspend' then
   update club_accounts set status='suspended',version=version+1 where id=t.id;
  elsif p_action='reactivate' then
   if t.status<>'suspended' then raise exception 'CONFLICT';end if;
   update club_accounts set status='active' where id=t.id;
  elsif p_action='promote' then
   if t.status<>'active' then raise exception 'INACTIVE';end if;
   update club_accounts set is_admin=true where id=t.id;
  elsif p_action='demote' then update club_accounts set is_admin=false where id=t.id;
  elsif p_action='reset_token' then
   if t.status<>'active' then raise exception 'INACTIVE';end if;
   delete from club_reset_tokens where account_id=t.id;
   insert into club_reset_tokens(token_hash,account_id) values(p->>'token',t.id);
  end if;
  if p_action in ('suspend','demote','reset_token') then
   delete from club_sessions where account_id=t.id;
   delete from club_import_tokens where account_id=t.id;
  end if;
  insert into club_account_audit(actor,target,action) values(a.id,t.id,p_action);
 else raise exception 'INVALID_ACTION';
 end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.sisal_style_compat() returns trigger language plpgsql set search_path=public as $$
declare k text;
begin
 foreach k in array array['nickname','entrance','celebration','introduction','skin','face','jaw','cheeks','nose','ears','eyes','eyeShape','brow','browWeight','mouth','lips','expression','hair','hairColor','hairTexture','hairPart','beard','beardColor','freckles','wrinkles','scar','beautyMark','goggles'] loop
  if old.appearance ? k and not(new.appearance ? k) then new.appearance:=new.appearance||jsonb_build_object(k,old.appearance->k);end if;
 end loop;return new;
end $$;
revoke all on function public.sisal_account(text,jsonb,text),public.sisal_style_compat() from public,anon,authenticated;
grant execute on function public.sisal_account(text,jsonb,text) to service_role;
commit;
