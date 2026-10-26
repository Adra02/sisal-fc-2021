// Identity is separate from the goalkeeper's current sporting role.
export const isKeeper=p=>!!(p?.keeperRole||p?.bot&&!p?.reserveKeeper);
export function keeperAtEnd(w,sign,context={}){
 if(w.match){const team=sign<0?1:0,key=w.match.keepers?.[team];return w.players.find(p=>key?p.key===key:p.bot&&p.team===team);}
 if(sign<0&&context.keeper){const human=w.players.find(p=>p.key===context.keeper&&!p.rest);if(human)return human;}
 return w.players.find(p=>p.key===(sign<0?'__keeper_bot':'__keeper_away_bot'));
}
