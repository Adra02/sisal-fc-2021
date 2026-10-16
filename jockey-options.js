const choices=(...labels)=>Object.fromEntries(labels.map(([key,label])=>[key,[label]]));
export const FACE_OPTIONS={
 skin:{porcelain:['Porcellana','#f4d9c5'],fair:['Chiara rosata','#eac3ae'],ivory:['Avorio','#e2bf9c'],peach:['Pesca','#dca98b'],sand:['Sabbia','#cfa17d'],olive:['Olivastra','#b78f68'],golden:['Dorata','#bd8658'],caramel:['Caramello','#a9714e'],bronze:['Bronzo','#916346'],umber:['Bruna','#78513a'],deep:['Scura','#5e3d2e'],ebony:['Ebano','#422c25']},
 face:choices(['oval','Ovale'],['round','Rotondo'],['square','Squadrato'],['heart','A cuore'],['angular','Angolare'],['narrow','Affusolato']),
 jaw:choices(['soft','Morbida'],['defined','Definita'],['square','Squadrata'],['tapered','Affusolata']),
 cheeks:choices(['natural','Naturali'],['full','Piene'],['high','Zigomi alti'],['lean','Scavate']),
 nose:choices(['straight','Dritto'],['button','Piccolo'],['aquiline','Aquilino'],['broad','Largo'],['upturned','All’insù'],['rounded','Arrotondato']),
 ears:choices(['regular','Regolari'],['small','Piccole'],['prominent','Pronunciate']),
 eyes:{brown:['Castani','#583d25'],dark:['Scuri','#261f19'],hazel:['Nocciola','#8a743e'],green:['Verdi','#49765b'],blue:['Blu','#4075a3'],grey:['Grigi','#839196'],amber:['Ambra','#b78b35'],ice:['Azzurri','#9bbfcc']},
 eyeShape:choices(['almond','A mandorla'],['round','Tondi'],['narrow','Sottili'],['wide','Aperti']),
 brow:choices(['straight','Dritte'],['arched','Arcuate'],['angled','Angolate'],['soft','Morbide'],['flat','Basse']),
 browWeight:choices(['fine','Sottili'],['medium','Medie'],['bold','Folte']),
 mouth:choices(['balanced','Equilibrata'],['narrow','Stretta'],['wide','Larga'],['full','Labbra piene']),
 lips:{natural:['Naturali','#ae7569'],rose:['Rosate','#bd7c7a'],warm:['Calde','#965f51'],dark:['Scure','#70473e'],muted:['Tenui','#997d71']},
 expression:choices(['focused','Concentrato'],['neutral','Neutro'],['smile','Sorriso'],['grin','Sorriso aperto'],['smirk','Sorrisetto'],['determined','Determinato'],['surprised','Sorpreso'],['serious','Serio'],['wink','Occhiolino'],['relaxed','Rilassato']),
 hair:choices(['bald','Rasato a pelle'],['buzz','Taglio cortissimo'],['crop','Corto strutturato'],['side','Riga laterale'],['quiff','Ciuffo'],['curly','Ricci corti'],['waves','Onde'],['long','Lunghi'],['ponytail','Coda'],['braids','Trecce'],['mohawk','Cresta'],['bob','Caschetto']),
 hairColor:{black:['Nero','#1d1917'],espresso:['Caffè','#35251c'],brown:['Castano','#65432d'],light:['Castano chiaro','#91663e'],blond:['Biondo','#c9a669'],platinum:['Platino','#e2d5b7'],auburn:['Ramato','#934b30'],red:['Rosso','#b86439'],grey:['Grigio','#8c8b83'],white:['Bianco','#e4e2da'],blue:['Blu notte','#334a70'],violet:['Viola','#694966']},
 hairTexture:choices(['smooth','Liscia'],['textured','Strutturata'],['coiled','Riccio fitto']),
 hairPart:choices(['none','Senza riga'],['left','Riga a sinistra'],['right','Riga a destra'],['center','Riga centrale']),
 beard:choices(['none','Senza barba'],['stubble','Barba corta'],['short','Barba piena corta'],['full','Barba piena'],['goatee','Pizzetto'],['moustache','Baffi'],['anchor','Ancora'],['chin','Solo mento'],['sideburns','Basette']),
 beardColor:{matching:['Come i capelli'],black:['Nera','#201b17'],brown:['Castana','#65432d'],auburn:['Ramata','#934b30'],blond:['Bionda','#c9a669'],grey:['Grigia','#99958c'],white:['Bianca','#dfdcd1']},
 freckles:choices(['none','Nessuna'],['light','Leggere'],['dense','Diffuse']),
 wrinkles:choices(['none','Viso liscio'],['subtle','Linee leggere'],['defined','Linee marcate']),
 scar:choices(['none','Nessuna'],['browLeft','Sopracciglio sinistro'],['browRight','Sopracciglio destro'],['cheek','Guancia']),
 beautyMark:choices(['none','Nessuno'],['left','Neo a sinistra'],['right','Neo a destra']),
 goggles:choices(['none','Senza occhialini'],['clear','Trasparenti'],['dark','Scuri'],['amber','Ambrati'])
};
export const FACE_DEFAULT={skin:'sand',face:'oval',jaw:'soft',cheeks:'natural',nose:'straight',ears:'regular',eyes:'brown',eyeShape:'almond',brow:'straight',browWeight:'medium',mouth:'balanced',lips:'natural',expression:'focused',hair:'crop',hairColor:'brown',hairTexture:'smooth',hairPart:'none',beard:'none',beardColor:'matching',freckles:'none',wrinkles:'none',scar:'none',beautyMark:'none',goggles:'none'};
export const FACE_GROUPS=[['viso','Viso e pelle',['skin','face','jaw','cheeks','nose','ears']],['sguardo','Occhi ed espressione',['eyes','eyeShape','brow','browWeight','mouth','lips','expression']],['capelli','Capelli e barba',['hair','hairColor','hairTexture','hairPart','beard','beardColor']],['dettagli','Dettagli',['freckles','wrinkles','scar','beautyMark','goggles']]];
export const FACE_LABELS={skin:'Tonalità della pelle',face:'Forma del viso',jaw:'Mandibola',cheeks:'Guance e zigomi',nose:'Naso',ears:'Orecchie',eyes:'Colore degli occhi',eyeShape:'Forma degli occhi',brow:'Forma sopracciglia',browWeight:'Spessore sopracciglia',mouth:'Forma della bocca',lips:'Colore delle labbra',expression:'Espressione',hair:'Acconciatura',hairColor:'Colore dei capelli',hairTexture:'Trama dei capelli',hairPart:'Riga dei capelli',beard:'Barba e baffi',beardColor:'Colore della barba',freckles:'Lentiggini',wrinkles:'Linee del viso',scar:'Cicatrice',beautyMark:'Neo',goggles:'Occhialini'};
