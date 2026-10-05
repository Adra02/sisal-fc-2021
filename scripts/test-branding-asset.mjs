import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root = process.cwd();
const html = await fs.readFile(`${root}/index.html`, 'utf8');
const sw = await fs.readFile(`${root}/sw.js`, 'utf8');
const png = await fs.readFile(`${root}/assets/sisal-branding.png`);

assert.match(html, /assets\/sisal-branding\.png\?v=32\.1\.3-logo/);
assert.match(sw, /sisal-fc27-shell-v32\.1\.3-logo/);
assert.match(sw, /assets\/sisal-branding\.png\?v=32\.1\.3-logo/);
assert.equal(png[0], 0x89);
assert.equal(png[1], 0x50);
assert.equal(png[2], 0x4e);
assert.equal(png[3], 0x47);
assert.equal(png[25], 6, 'Il branding PNG deve essere RGBA con canale alpha.');
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
assert.equal(width, 1536);
assert.equal(height, 857);
console.log('test-branding-asset: OK');
