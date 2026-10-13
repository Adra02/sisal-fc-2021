// Exact gamer-tag comparison: case/Unicode/spacing normalized, punctuation and
// accents preserved. No fuzzy matching and no positional identity.
export const normalizePlayerName=value=>String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
export const syntheticPlayerId=value=>/^(?:player|match)-\d+$/.test(String(value||''));
export const playerNameKey=p=>JSON.stringify([normalizePlayerName(p?.name),normalizePlayerName(p?.platform),String(p?.clubId||'')]);
export function stablePlayerId(name,platform=''){
  return 'name:'+encodeURIComponent(JSON.stringify([normalizePlayerName(name),normalizePlayerName(platform)]));
}
export function uniqueNamedPlayer(list,player){
  const name=normalizePlayerName(player?.name);if(!name)return null;
  const platform=normalizePlayerName(player?.platform);
  const candidates=(list||[]).filter(p=>normalizePlayerName(p.name)===name&&(!player?.clubId||!p.clubId||String(player.clubId)===String(p.clubId))&&(!platform||!p.platform||normalizePlayerName(p.platform)===platform));
  return candidates.length===1?candidates[0]:null;
}
export function photoIdentity(clubId,playerName){
  const club=String(clubId??'').trim(),name=normalizePlayerName(playerName);
  if(!club||club.length>100||!name||name.length>120||/^giocatore \d+$/i.test(name))throw new Error('Identità del giocatore incompleta.');
  return JSON.stringify(['photo-v2',club,name]);
}
