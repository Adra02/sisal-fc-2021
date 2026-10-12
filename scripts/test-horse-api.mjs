import assert from 'node:assert/strict';
import {createRace,completeRace,publicRecord} from '../lib/horse-racing/service.js';
import {GET,POST} from '../api/horse-races.js';
class MemoryCollection {
 docs=[];
 async countDocuments(filter){return this.docs.filter(d=>d.ipHash===filter.ipHash&&d.createdAt>filter.createdAt.$gt).length;}
 async insertOne(d){this.docs.push(structuredClone(d));}
 async findOne(query){return this.docs.find(d=>Object.entries(query).every(([k,v])=>d[k]===v))||null;}
 async updateOne(q,u){const d=await this.findOne(q);if(d){Object.assign(d,u.$set);for(const k of Object.keys(u.$unset||{}))delete d[k];}}
}
const db=new MemoryCollection(),createdAt=new Date('2026-01-01'),participants=[{name:'A'},{name:'B'},{name:'C'}];
const {race,token}=await createRace(db,{participants,title:'Test'},'test-ip',createdAt);
assert.equal(race.status,'pending');assert.equal(race.results,undefined);
assert.equal(race.tokenHash,undefined);assert.equal(race.ipHash,undefined);
await assert.rejects(()=>completeRace(db,{raceId:race.raceId,token},new Date(createdAt.getTime()+1000)),/non è ancora terminata/);
assert.equal(db.docs[0].status,'pending');
await assert.rejects(()=>completeRace(db,{raceId:race.raceId,token:'0'.repeat(64)},new Date(createdAt.getTime()+60000)),/non trovata/);
const result=await completeRace(db,{raceId:race.raceId,token,results:[{name:'FAKE',position:1}],seed:999},new Date(createdAt.getTime()+60000));
assert.equal(result.status,'completed');assert.equal(result.seed,race.seed);assert.ok(result.results.every(r=>r.name!=='FAKE'));assert.equal(db.docs[0].expiresAt,undefined);
assert.deepEqual(await completeRace(db,{raceId:race.raceId,token}),publicRecord(db.docs[0]));
for(let i=0;i<3;i++)await createRace(db,{participants},'test-ip',createdAt);
await assert.rejects(()=>createRace(db,{participants},'test-ip',createdAt),/Aspetta un minuto/);
const before=process.env.MONGODB_URI;delete process.env.MONGODB_URI;
const health=await GET(new Request('https://test.local/api/horse-races?action=health'));assert.equal(health.status,503);assert.equal((await health.json()).code,'NOT_CONFIGURED');
if(before)process.env.MONGODB_URI=before;
const post=body=>new Request('https://test.local/api/horse-races',{method:'POST',headers:{'content-type':'application/json','origin':'https://evil.local'},body:JSON.stringify(body)});
assert.equal((await POST(post({action:'create',participants}))).status,403);
assert.equal((await POST(new Request('https://test.local/api/horse-races',{method:'POST',headers:{'content-type':'application/json'},body:'broken'}))).status,400);
console.log('PASS: pending isolation, forged results ignored, token checks, exact server reconstruction, idempotency, limits, safe health errors, origin validation. MongoDB transport not exercised.');
