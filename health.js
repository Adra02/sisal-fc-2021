import { blobAuthOptions, hasBlobConfig } from '../lib/shared-store.js';

function blobMode() {
  const auth = blobAuthOptions();
  if (!auth) return 'not-configured';
  if (auth.token) return 'read-write-token';
  return 'vercel-oidc';
}

export function GET() {
  return Response.json({
    ok: true,
    service: 'sisal-fc-2021-fc27',
    runtime: 'vercel-node',
    data: {
      source: 'shared uploaded JSON/TXT files',
      blobConfigured: hasBlobConfig(),
      blobAuth: blobMode()
    },
    ai: {
      geminiConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
      geminiModel: 'gemini-3.5-flash-lite',
      searchGrounding: false
    }
  });
}
