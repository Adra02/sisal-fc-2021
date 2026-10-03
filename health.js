import { hasBlobConfig } from '../lib/shared-store.js';
export function GET(){return Response.json({ok:true,service:'sisal-fc-2021-fc27',runtime:'vercel-node',data:{source:'shared uploaded JSON/TXT files',blobConfigured:hasBlobConfig()},ai:{geminiConfigured:Boolean(String(process.env.GEMINI_API_KEY||'').trim()),geminiModel:'gemini-3.5-flash-lite',searchGrounding:false}})}
