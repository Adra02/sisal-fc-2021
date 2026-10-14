// Local emergency recovery. No network call; run only as the Supabase project owner.
import {randomBytes,createHash} from 'node:crypto';
const token=randomBytes(32).toString('base64url');
const hash=createHash('sha256').update(token).digest('hex');
console.log(`RECUPERO DI EMERGENZA — NON PUBBLICARE QUESTO OUTPUT\n\n1. Esegui SOLO il seguente SQL nel tuo progetto Supabase:\n\nbegin;
do $$
declare target uuid;
begin
 perform pg_advisory_xact_lock(328794,2701);
 select id into target from public.club_accounts where player_key='adrathetrue02' and is_owner;
 if target is null then raise exception 'Account proprietario non trovato'; end if;
 delete from public.club_sessions where account_id=target;
 delete from public.club_import_tokens where account_id=target;
 delete from public.club_reset_tokens where account_id=target;
 insert into public.club_reset_tokens(token_hash,account_id) values('${hash}',target);
 insert into public.club_account_audit(target,action) values(target,'owner_emergency_recovery');
end $$;
commit;
\n2. Entro 30 minuti dall’esecuzione SQL: app > Hai dimenticato la password?\nCodice temporaneo: ${token}\n\n3. Scegli una nuova password. Il codice si usa una sola volta.\nTutti gli accessi precedenti e la chiave Termux del proprietario sono revocati.\nChiudi questa finestra dopo il recupero; non condividere il codice.`);
