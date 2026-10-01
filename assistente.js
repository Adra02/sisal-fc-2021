export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Metodo non consentito'});
  const key=process.env.GEMINI_API_KEY;
  if(!key) return res.status(500).json({error:'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.'});
  const {question,players,matches,notes}=req.body||{};
  if(!question) return res.status(400).json({error:'Domanda mancante.'});
  const model=process.env.GEMINI_MODEL||'gemini-3.8-flash';
  const prompt=`Sei l'assistente tecnico di una squadra EA SPORTS FC 27 Clubs chiamata Sisal FC 2021. Analizza SOLO i dati forniti. Non inventare statistiche. Se un dato non è presente, dichiaralo. Rispondi in italiano in modo concreto e breve.

DOMANDA:\n${question}

NOTE TATTICHE:\n${String(notes||'')}

GIOCATORI:\n${JSON.stringify(players||[])}

PARTITE:\n${JSON.stringify(matches||[])}`;
  try{
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message||'Errore Gemini'});
    const answer=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
    return res.status(200).json({answer:answer||'Gemini non ha restituito una risposta.'});
  }catch(e){ return res.status(500).json({error:e.message||'Errore server'}); }
}
