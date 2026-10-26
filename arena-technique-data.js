export const TECHNIQUES={
 heelPass:{label:'Colpo di tacco',gesture:'heel',wind:.26,duration:.78},
 outsidePass:{label:'Passaggio di esterno',gesture:'outside',wind:.21,duration:.66},
 outsideShot:{label:'Tiro di esterno',gesture:'outside',wind:.28,duration:.86},
 chip:{label:'Pallonetto',gesture:'chip',wind:.27,duration:.85},
 bicycle:{label:'Rovesciata',gesture:'bicycle',wind:.30,duration:1.35},
 scissor:{label:'Sforbiciata',gesture:'scissor',wind:.25,duration:1.10},
 volley:{label:'Tiro al volo',gesture:'volley',wind:.18,duration:.78},
 header:{label:'Colpo di testa',gesture:'header',wind:.13,duration:.65},
 stepover:{label:'Doppio passo',gesture:'stepover',wind:.48,duration:.90},
 bodyFeint:{label:'Finta di corpo',gesture:'bodyFeint',wind:.36,duration:.80},
 soleRoll:{label:'Suola e cambio direzione',gesture:'soleRoll',wind:.48,duration:.90}
};
export const techniqueLabel=type=>TECHNIQUES[type]?.label||'';
