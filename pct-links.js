const ALLOWED_HOSTS = new Set(['proclubstracker.com', 'www.proclubstracker.com']);
const SECTION_ORDER = ['stats', 'fun', 'players', 'matches'];
const REQUIRED_OWN = ['stats', 'fun', 'players', 'matches'];
const REQUIRED_OPP = ['stats', 'players', 'matches'];

function str(v) { return v == null ? '' : String(v).trim(); }
function normalizeLink(v) { return str(v); }

export function normalizePCTLinks(raw, role='own') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Mancano i link di Pro Clubs Tracker.');
  const required = role === 'opponent' ? REQUIRED_OPP : REQUIRED_OWN;
  const links = {};
  for (const key of SECTION_ORDER) links[key] = normalizeLink(raw[key]);
  for (const key of required) {
    if (!links[key]) throw new Error(`Manca il link PCT della sezione ${key === 'stats' ? 'Statistiche' : key === 'fun' ? 'Fun' : key === 'players' ? 'Giocatori' : 'Partite'}.`);
    if (links[key].length > 2000) throw new Error(`Il link PCT della sezione ${key} è troppo lungo.`);
    let url;
    try { url = new URL(links[key]); } catch { throw new Error(`Il link della sezione ${key} non è un URL valido.`); }
    if (url.protocol !== 'https:') throw new Error(`Il link della sezione ${key} deve usare HTTPS.`);
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error(`Il link della sezione ${key} deve appartenere a proclubstracker.com.`);
    if (url.username || url.password) throw new Error(`Il link della sezione ${key} non può contenere credenziali.`);
    url.hash = '';
    links[key] = url.toString();
  }
  if (role === 'opponent') links.fun = '';
  return links;
}

export function pctLinkKey(role, links) {
  const normalized = normalizePCTLinks(links, role);
  return `${role}:${JSON.stringify(SECTION_ORDER.reduce((o,k)=>(o[k]=normalized[k],o),{}))}`;
}

export { SECTION_ORDER, REQUIRED_OWN, REQUIRED_OPP, ALLOWED_HOSTS };
