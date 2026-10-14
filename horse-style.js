// Shared cosmetic contract. No scores, timing, randomness or gameplay settings.
export const OPTIONS={
 coat:{bay:['Baio','#744c36'],black:['Morello','#292827'],chestnut:['Sauro','#a56642'],grey:['Grigio','#b9b7af'],cream:['Palomino','#d7b781'],white:['Bianco','#e6e2d8']},
 mane:{dark:['Nera','#1c1716'],brown:['Castana','#503427'],silver:['Argento','#aba8a0'],gold:['Dorata','#cfad77']},
 silk:{green:['Sisal','#168553'],navy:['Notte','#284568'],burgundy:['Bordeaux','#803344'],gold:['Oro','#c5a15a'],ivory:['Avorio','#e9e3d3'],violet:['Viola','#685490']},
 accent:{ivory:['Avorio','#f0e8d5'],gold:['Oro','#dfbc69'],green:['Verde','#23845a'],black:['Nero','#212b27']},
 pattern:{sash:['Fascia diagonale'],stripes:['Righe'],chevron:['Chevron'],plain:['Tinta unita']},
 saddle:{brown:['Cuoio','#66432b'],black:['Nero','#252323'],tan:['Miele','#ac7a47']},
 helmet:{matching:['Coordinato'],black:['Nero'],ivory:['Avorio']},
 marking:{none:['Nessuna'],star:['Stella'],blaze:['Lista bianca']}
};
export const DEFAULT={coat:'bay',mane:'dark',silk:'green',accent:'ivory',pattern:'sash',saddle:'brown',helmet:'matching',marking:'blaze'};
export const nameKey=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
export function validateStyle(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(OPTIONS,k)))throw Error('INVALID_STYLE');
 const result={};for(const k of Object.keys(OPTIONS)){const v=input[k]??DEFAULT[k];if(!Object.hasOwn(OPTIONS[k],v))throw Error('INVALID_STYLE');result[k]=v;}return result;
}
export function styleColors(input){let s;try{s=validateStyle(input||{})}catch{s={...DEFAULT}}return {...s,coatColor:OPTIONS.coat[s.coat][1],maneColor:OPTIONS.mane[s.mane][1],silkColor:OPTIONS.silk[s.silk][1],accentColor:OPTIONS.accent[s.accent][1],saddleColor:OPTIONS.saddle[s.saddle][1],helmetColor:s.helmet==='matching'?OPTIONS.silk[s.silk][1]:s.helmet==='black'?'#202622':'#eee8d9'};}
export function paintSilks(c,w,h,s){c.fillStyle=s.silkColor;c.fillRect(0,0,w,h);c.fillStyle=s.accentColor;
 if(s.pattern==='sash'){c.beginPath();c.moveTo(0,h*.13);c.lineTo(w,h*.62);c.lineTo(w,h*.78);c.lineTo(0,h*.29);c.fill();}
 if(s.pattern==='stripes')for(let x=w*.1;x<w;x+=w*.3)c.fillRect(x,0,w*.1,h);
 if(s.pattern==='chevron'){c.beginPath();c.moveTo(0,h*.2);c.lineTo(w*.5,h*.6);c.lineTo(w,h*.2);c.lineTo(w,h*.4);c.lineTo(w*.5,h*.8);c.lineTo(0,h*.4);c.fill();}
}
