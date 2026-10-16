import {FACE_OPTIONS,FACE_DEFAULT} from './jockey-options.js';
// Shared cosmetic contract. No scores, timing, randomness or gameplay settings.
export const OPTIONS={...FACE_OPTIONS,
 entrance:{salute:['Saluto'],arms:['Braccia al cielo'],bow:['Inchino'],crowd:['Verso il pubblico']},
 celebration:{salute:['Saluto'],arms:['Braccia al cielo'],bow:['Inchino'],crowd:['Verso il pubblico']},
 introduction:{on:['Mostra introduzione'],off:['Vai direttamente alla corsa']},
 coat:{bay:['Baio','#744c36'],black:['Morello','#292827'],chestnut:['Sauro','#a56642'],grey:['Grigio','#b9b7af'],cream:['Palomino','#d7b781'],white:['Bianco','#e6e2d8']},
 mane:{dark:['Nera','#1c1716'],brown:['Castana','#503427'],silver:['Argento','#aba8a0'],gold:['Dorata','#cfad77']},
 silk:{green:['Sisal','#168553'],navy:['Notte','#284568'],burgundy:['Bordeaux','#803344'],gold:['Oro','#c5a15a'],ivory:['Avorio','#e9e3d3'],violet:['Viola','#685490']},
 accent:{ivory:['Avorio','#f0e8d5'],gold:['Oro','#dfbc69'],green:['Verde','#23845a'],black:['Nero','#212b27']},
 pattern:{diamonds:['Losanghe'],hoops:['Fasce orizzontali'],sash:['Fascia diagonale'],stripes:['Righe'],chevron:['Chevron'],plain:['Tinta unita']},
 saddle:{brown:['Cuoio','#66432b'],black:['Nero','#252323'],tan:['Miele','#ac7a47']},
 helmet:{matching:['Coordinato'],black:['Nero'],ivory:['Avorio']},
 cloth:{matching:['Coordinato'],forest:['Verde bosco','#104c38'],navy:['Blu notte','#192d49'],ivory:['Avorio','#e6ddca'],wine:['Bordeaux','#642936']},
 trim:{gold:['Ottone','#d4b473'],silver:['Acciaio','#c3cbd0'],dark:['Brunito','#565c59']},
 socks:{none:['Nessuna'],rear:['Posteriori'],all:['Quattro balzane']},
 gloves:{black:['Neri','#212522'],brown:['Cuoio','#69452f'],ivory:['Avorio','#e6ddca']},
 breeches:{ivory:['Avorio','#e6ddca'],white:['Bianco','#f2f0e9'],grey:['Grigio perla','#aeb6b2']}

};
export const DEFAULT={...FACE_DEFAULT,entrance:'salute',celebration:'salute',introduction:'on',nickname:'',coat:'bay',mane:'dark',silk:'green',accent:'ivory',pattern:'sash',saddle:'brown',helmet:'matching',cloth:'matching',trim:'gold',socks:'none',gloves:'black',breeches:'ivory',number:''};
export const nameKey=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
// Legacy marking values are accepted but discarded: no face marking is rendered or saved.
export function validateStyle(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='nickname'&&k!=='number'&&k!=='marking'&&!Object.hasOwn(OPTIONS,k)))throw Error('INVALID_STYLE');
 const result={};for(const k of Object.keys(OPTIONS)){const v=input[k]??DEFAULT[k];if(!Object.hasOwn(OPTIONS[k],v))throw Error('INVALID_STYLE');result[k]=v;}const n=input.number??'';if(n!==''&&!/^[1-9][0-9]?$/.test(String(n)))throw Error('INVALID_STYLE');result.number=n===''?'':String(n);const nickname=String(input.nickname??'').normalize('NFKC').trim();if(nickname.length>30||/[<>\x00-\x1f\x7f]/.test(nickname))throw Error('INVALID_STYLE');result.nickname=nickname;return result;
}
export function styleColors(input){let s;try{s=validateStyle(input||{})}catch{s={...DEFAULT}}return {...s,skinColor:OPTIONS.skin[s.skin][1],hairHex:OPTIONS.hairColor[s.hairColor][1],eyeColor:OPTIONS.eyes[s.eyes][1],lipColor:OPTIONS.lips[s.lips][1],beardHex:s.beardColor==='matching'?OPTIONS.hairColor[s.hairColor][1]:OPTIONS.beardColor[s.beardColor][1],clothColor:s.cloth==='matching'?OPTIONS.silk[s.silk][1]:OPTIONS.cloth[s.cloth][1],trimColor:OPTIONS.trim[s.trim][1],glovesColor:OPTIONS.gloves[s.gloves][1],breechesColor:OPTIONS.breeches[s.breeches][1],coatColor:OPTIONS.coat[s.coat][1],maneColor:OPTIONS.mane[s.mane][1],silkColor:OPTIONS.silk[s.silk][1],accentColor:OPTIONS.accent[s.accent][1],saddleColor:OPTIONS.saddle[s.saddle][1],helmetColor:s.helmet==='matching'?OPTIONS.silk[s.silk][1]:s.helmet==='black'?'#202622':'#eee8d9'};}
export function paintSilks(c,w,h,s){c.fillStyle=s.silkColor;c.fillRect(0,0,w,h);c.fillStyle=s.accentColor;
 if(s.pattern==='hoops')for(let y=h*.15;y<h;y+=h*.3)c.fillRect(0,y,w,h*.12);
 if(s.pattern==='diamonds')for(let y=-h*.25;y<h;y+=h*.5)for(let x=0;x<w;x+=w*.5){c.beginPath();c.moveTo(x+w*.25,y);c.lineTo(x+w*.5,y+h*.25);c.lineTo(x+w*.25,y+h*.5);c.lineTo(x,y+h*.25);c.closePath();c.fill();}
 if(s.pattern==='sash'){c.beginPath();c.moveTo(0,h*.13);c.lineTo(w,h*.62);c.lineTo(w,h*.78);c.lineTo(0,h*.29);c.fill();}
 if(s.pattern==='stripes')for(let x=w*.1;x<w;x+=w*.3)c.fillRect(x,0,w*.1,h);
 if(s.pattern==='chevron'){c.beginPath();c.moveTo(0,h*.2);c.lineTo(w*.5,h*.6);c.lineTo(w,h*.2);c.lineTo(w,h*.4);c.lineTo(w*.5,h*.8);c.lineTo(0,h*.4);c.fill();}
}
