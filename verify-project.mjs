import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'api/club-data.js',
  'api/assistente.js',
  'knowledge/fc27-knowledge.json',
  'config/fc27-sources.json'
];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`File mancante: ${file}`);
}

JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'knowledge/fc27-knowledge.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'config/fc27-sources.json'), 'utf8'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes('<!doctype html>') || !html.includes('</html>')) {
  throw new Error('index.html non sembra un documento HTML completo.');
}

console.log('Build check OK: progetto pronto per Vercel.');
