import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const s=await fs.readFile(new URL('../lib/shared-store.js',import.meta.url),'utf8');
assert.match(s,/sisal-fc\/fc27\/shared/);
assert.match(s,/players.*league.*playoffs.*friendlies/s);
assert.match(s,/access: 'private'/);
assert.match(s,/useCache: false/);
assert.match(s,/BLOB_READ_WRITE_TOKEN/);
assert.match(s,/BLOB_STORE_ID/);
assert.match(s,/VERCEL_OIDC_TOKEN/);
assert.match(s,/function blobAuthOptions/);
assert.doesNotMatch(s,/String\(process\.env\.VERCEL \\|\\\| ''\)\.trim\(\) === '1'/);
console.log('test-shared-contract: OK');

assert.doesNotMatch(s,/DATA_ADMIN_PIN|x-admin-pin|hasAdminPin/i);
console.log('test-shared-contract-no-pin: OK');
