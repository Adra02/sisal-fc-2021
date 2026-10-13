-- Run before migration. Remove this RPC after successful verification (04).
create or replace function public.sisal_import(p jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 lock table team_state,communications,communication_reactions,player_photos in access exclusive mode;
 if exists(select 1 from communications) or exists(select 1 from player_photos) or exists(select 1 from team_state where files<>'{}' or totals is not null or memory->'snapshots'<>'[]') then raise exception 'TARGET_NOT_EMPTY';end if;
 update team_state t set files=x.files,totals=x.totals,memory=x.memory,revision=t.revision+1,updated_at=now() from jsonb_to_recordset(p->'team_state') as x(role text,files jsonb,totals jsonb,memory jsonb) where t.role=x.role;
 insert into communications(id,title,body,image_path,pinned,archived,revision,created_at,updated_at) select id,title,body,image_path,pinned,archived,revision,created_at,updated_at from jsonb_populate_recordset(null::communications,p->'communications');
 insert into communication_reactions(communication_id,device_id) select communication_id,device_id from jsonb_populate_recordset(null::communication_reactions,p->'communication_reactions');
 insert into player_photos(player_key,record,image_path) select player_key,record,image_path from jsonb_populate_recordset(null::player_photos,p->'player_photos');
end $$;
revoke all on function public.sisal_import(jsonb) from public,anon,authenticated;
grant execute on function public.sisal_import(jsonb) to service_role;
