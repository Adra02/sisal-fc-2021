import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const required = [
  'index.html',
  'package.json',
  'api/assistente.js',
  'config/fc27-sources.json',
  'knowledge/fc27-knowledge.json',
  'scripts/update-fc27-knowledge.mjs',
  '.github/workflows/update-fc27-knowledge.yml'
];

function fail(message) {
  console.error(`VALIDATION FAILED: ${message}`);
  process.exitCode = 1;
}

for (const rel of required) {
  if (!fs.existsSync(path.join(ROOT, rel))) fail(`missing ${rel}`);
}

if (fs.existsSync(path.join(ROOT, 'fc27-knowledge.json'))) {
  fail('fc27-knowledge.json must not exist in repository root');
}

const forbiddenPath = path.join(ROOT, 'knowledge', 'knowledge', 'fc27-knowledge.json');
if (fs.existsSync(forbiddenPath)) fail('found duplicated knowledge/knowledge path');

const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/update-fc27-knowledge.yml'), 'utf8');
if (!/node-version:\s*24(?:\.x)?/i.test(workflow)) fail('GitHub Actions must use Node 24');
if (/node-version:\s*20\b/i.test(workflow)) fail('GitHub Actions still contains Node 20');
if (!/git add\s+knowledge\/fc27-knowledge\.json/.test(workflow)) fail('workflow must git add knowledge/fc27-knowledge.json');

const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (/process\.env\.GEMINI_API_KEY/.test(index)) fail('GEMINI_API_KEY must never be read from frontend');
if (/knowledge\/knowledge\/fc27-knowledge\.json/.test(index)) fail('invalid duplicated knowledge path in frontend');
if (!/knowledge\/fc27-knowledge\.json/.test(index)) fail('frontend does not reference knowledge/fc27-knowledge.json');

const updater = fs.readFileSync(path.join(ROOT, 'scripts/update-fc27-knowledge.mjs'), 'utf8');
if (!/path\.join\(ROOT,\s*['"]knowledge['"],\s*['"]fc27-knowledge\.json['"]\)/.test(updater)) fail('updater must use knowledge/fc27-knowledge.json');
if (!/v1beta\/interactions/.test(updater)) fail('YouTube analyzer must use Gemini Interactions API');
if (/file_uri\s*:\s*video\.url/.test(updater)) fail('legacy invalid YouTube file_uri usage detected');
if (!/type:\s*['"]video['"],\s*uri:\s*video\.url/.test(updater)) fail('YouTube URL must be passed as Gemini video uri');

for (const jsonFile of ['package.json', 'config/fc27-sources.json', 'knowledge/fc27-knowledge.json']) {
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, jsonFile), 'utf8'));
  } catch (error) {
    fail(`invalid JSON in ${jsonFile}: ${error.message}`);
  }
}

for (const jsFile of ['api/assistente.js', 'scripts/update-fc27-knowledge.mjs', 'scripts/validate-project.mjs']) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, jsFile)], { stdio: 'pipe' });
  } catch (error) {
    fail(`JavaScript syntax error in ${jsFile}`);
  }
}

const inlineMatch = index.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i);
if (!inlineMatch) {
  fail('index.html has no inline script block');
} else {
  const temp = path.join(ROOT, '.index-inline-check.tmp.js');
  try {
    fs.writeFileSync(temp, inlineMatch[1], 'utf8');
    execFileSync(process.execPath, ['--check', temp], { stdio: 'pipe' });
  } catch {
    fail('JavaScript syntax error in index.html inline script');
  } finally {
    try { fs.unlinkSync(temp); } catch {}
  }
}

if (!process.exitCode) {
  console.log('Validation OK');
  console.log('- repository paths are correct');
  console.log('- Node 24 is configured');
  console.log('- Gemini API key stays server-side');
  console.log('- YouTube uses Gemini Interactions API with a video URI');
  console.log('- JSON and JavaScript syntax checks passed');
}
