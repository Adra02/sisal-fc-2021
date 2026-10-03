export function GET() {
  return Response.json({
    ok: true,
    service: 'sisal-fc-2021-fc27',
    runtime: 'vercel-node',
    ai: {
      geminiConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
      geminiModel: 'gemini-3.5-flash-lite',
      liveClubDataSource: 'Pro Clubs Tracker public website (server-side browser)',
      proClubsTrackerReference: 'https://proclubstracker.com/',
      liveClubDataUsesGemini: false
    }
  });
}
