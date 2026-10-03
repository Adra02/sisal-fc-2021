export function GET() {
  return Response.json({
    ok: true,
    service: 'sisal-fc-2021-fc27',
    runtime: 'vercel-node',
    clubData: {
      source: 'EA FC27 Clubs API via browser-compatible Chromium client',
      search: 'currentSeasonLeaderboard/search',
      platformDefault: 'common-gen5'
    },
    ai: {
      geminiConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
      geminiModel: 'gemini-3.5-flash-lite',
      searchGrounding: false,
      liveClubDataUsesGemini: false
    }
  });
}
