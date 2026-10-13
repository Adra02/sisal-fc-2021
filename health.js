import {hasStorageConfig,rpc} from '../lib/supabase.js';
export async function GET(){
 let reachable=false;if(hasStorageConfig()){try{await rpc('sisal_team_read',{p_role:'own'});reachable=true}catch{}}
 return Response.json({ok:reachable,service:'sisal-fc-2021-fc27',runtime:'vercel-node',data:{source:'Supabase PostgreSQL + private Storage',supabaseConfigured:hasStorageConfig(),databaseReachable:reachable},ai:{geminiConfigured:Boolean(process.env.GEMINI_API_KEY),geminiModel:'gemini-3.5-flash-lite',searchGrounding:false}},{status:reachable?200:503,headers:{'Cache-Control':'no-store'}});
}
