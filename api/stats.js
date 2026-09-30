export default async function handler(req, res) {
  // Configurazione per Sisal FC 2021
  const CLUB_ID = "328794";
  const PLATFORM = "common-gen5";

  // Intestazioni per simulare una richiesta da browser reale
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.ea.com/'
  };

  try {
    const [membersRes, matchesRes] = await Promise.all([
      fetch(`https://proclubs.ea.com/api/fc/members/stats?platform=${PLATFORM}&clubId=${CLUB_ID}`, { headers }),
      fetch(`https://proclubs.ea.com/api/fc/clubs/matches?matchType=leagueMatch&platform=${PLATFORM}&clubIds=${CLUB_ID}`, { headers })
    ]);

    let members = [];
    let matches = [];

    if (membersRes.ok) {
      members = await membersRes.json();
    }
    if (matchesRes.ok) {
      matches = await matchesRes.json();
    }

    // Risposta inviata al frontend
    return res.status(200).json({
      success: true,
      members: members,
      matches: matches
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Errore durante il recupero dei dati da EA Sports",
      details: error.message
    });
  }
}
