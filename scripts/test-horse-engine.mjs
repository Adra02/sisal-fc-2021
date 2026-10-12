import assert from 'node:assert/strict';
import { simulateRace, sampleRace, STEP, SETTINGS, raceRecord } from '../race-engine.js';
const players=Array.from({length:6},(_,i)=>({name:'Player '+i,color:'#36b68b'}));
let photos=0,passes=0;const wins=new Set();
for(let seed=0;seed<200;seed++){
  const race=simulateRace(seed,players);
  assert.equal(race.results.length,players.length);
  assert.equal(race.results.filter(r=>r.position===1).length,1);
  assert.equal(new Set(race.results.map(r=>r.position)).size,players.length);
  assert.ok(race.duration<180);
  assert.deepEqual(raceRecord(race),raceRecord(simulateRace(seed,players)));
  wins.add(race.results[0].participantId);photos+=Number(race.photoFinish);
  for(const result of race.results){
    const i=Number(result.participantId)-1,s=result.statistics;passes+=s.overtakes;
    assert.ok(Number.isFinite(result.time)&&result.time>0);
    assert.equal(result.gap,result.time-race.results[0].time);
    assert.equal(s.averageSpeed,SETTINGS.distance/result.time);
    assert.ok(s.maxSpeed>=s.averageSpeed&&s.sprintSpeed>0);
    assert.ok(s.averagePosition>=s.bestPosition&&s.averagePosition<=s.worstPosition);
    assert.ok(s.timeLeading<=result.time+.000001);
    const before=sampleRace(race,result.time-1e-6).runners[i],at=sampleRace(race,result.time).runners[i];
    assert.equal(before.crossed,false);assert.ok(before.x<SETTINGS.distance);
    assert.equal(at.crossed,true);assert.equal(at.x,SETTINGS.distance);
  }
  assert.equal(race.results.reduce((s,r)=>s+r.statistics.overtakes,0),race.results.reduce((s,r)=>s+r.statistics.overtaken,0));
  assert.equal(race.photoFinish,race.results[1].gap<=SETTINGS.photoThreshold);
  for(let frame=1;frame<race.frames.length;frame+=17){
    const f=race.frames[frame],previous=race.frames[frame-1],snap=sampleRace(race,f.t);
    for(let i=0;i<players.length;i++){
      assert.ok(f.runners[i].x>=previous.runners[i].x);assert.ok(f.runners[i].x<=SETTINGS.distance);
      for(let j=i+1;j<players.length;j++)assert.ok(Math.abs(f.runners[i].lane-f.runners[j].lane)*3.3>=2.1);
    }
    const unfinished=snap.ordered.filter(r=>!r.crossed);for(let i=1;i<unfinished.length;i++)assert.ok(unfinished[i-1].x>=unfinished[i].x);
  }
}
assert.ok(photos<40,'Photo finish should remain occasional');assert.equal(wins.size,6);assert.ok(passes>100);
// Each display samples the same timeline. Arrival callbacks carry exact sub-frame times.
const race=simulateRace(749,players);
for(const fps of [15,30,60,120,144]){
  const seen=new Map();for(let frame=0;frame/fps<race.duration+1;frame++){
    for(const r of sampleRace(race,frame/fps).ordered)if(r.crossed&&!seen.has(r.result.participantId))seen.set(r.result.participantId,r.result.time);
  }
  assert.deepEqual([...seen.entries()].sort((a,b)=>a[1]-b[1]),race.results.map(r=>[r.participantId,r.time]));
}
assert.equal(simulateRace(0,[{name:'Solo'}]).results[0].position,1);
assert.equal(simulateRace(0,Array.from({length:32},(_,i)=>({name:'P'+i}))).results.length,32);
assert.throws(()=>simulateRace(1,[]));assert.throws(()=>simulateRace(-1,players));
assert.throws(()=>simulateRace(1,[{name:''}]));
console.log(`PASS: 200 seeds, deterministic replay, 15/30/60/120/144 FPS, crossings, ranks, stats, lane separation; photo finishes ${photos}/200, overtakes ${passes}.`);
