export function GET() {
  return Response.json({
    ok: true,
    service: 'sisal-fc-2021-fc27',
    runtime: 'vercel-node',
    ai: {
      geminiConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
      geminiSyncModel: 'gemini-2.5-flash-lite',
      groqConfigured: Boolean(String(process.env.GROQ_API_KEY || '').trim())
    }
  });
}
