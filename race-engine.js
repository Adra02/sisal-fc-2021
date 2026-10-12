/* SISAL race engine v1. Immutable 60 Hz simulation shared by browser and server.
 * Scores from football are deliberately not inputs to race outcomes.
 * Keep this version available for historical replay when adding a new engine. */
export const ENGINE_VERSION = 1;
export const STEP = 1 / 60;
export const SETTINGS = Object.freeze({ distance: 400, photoThreshold: .035 });
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
export function validateParticipants(input) {
  if (!Array.isArray(input) || !input.length || input.length > 32) throw new Error('Servono da 1 a 32 partecipanti.');
  return input.map((p, i) => {
    if (typeof p?.name !== 'string' || !p.name.trim() || p.name.length > 80) throw new Error('Nome partecipante non valido.');
    return { id: String(i + 1), name: p.name.trim(), color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#36b68b' };
  });
}
export function simulateRace(seed, input) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed non valido.');
  const participants = validateParticipants(input), random = rng(seed), n = participants.length;
  const runners = participants.map((p, i) => ({
    ...p, x: 0, lane: i, speed: 0, stamina: 1, phase: random() * 6.28, stride: 0,
    base: 14.4 + random() * 2, max: 18 + random() * 2.8, acceleration: 3.8 + random() * 2.6,
    reaction: .12 + random() * .55, form: .96 + random() * .08,
    endurance: .78 + random() * .44, consistency: .15 + random() * .6,
    start: random(), comeback: random(), sprint: random(), rhythm: .35 + random() * .6,
    finishTime: null, positionSum: 0, samples: 0, best: n, worst: 1,
    overtakes: 0, passed: 0, leadTime: 0, maxSpeed: 0, sprintDistance: 0, sprintTime: 0,
    startPosition: i + 1, previousRank: i + 1, gapAtSprint: null
  }));
  const frames = [], events = [], arrivals = [];
  let order = runners.map((_, i) => i), previousLeader = -1, lastEvent = -10, finalEvent = false;
  function capture(t) { frames.push({ t, runners: runners.map(r => ({ x: r.x, lane: r.lane, speed: r.speed, stamina: r.stamina, stride: r.stride })) }); }
  capture(0);
  for (let tick = 1; tick <= 180 * 60; tick++) {
    const t = tick * STEP, old = runners.map(r => ({ x: r.x, lane: r.lane }));
    const leaderX = Math.max(...old.map(r => r.x));
    runners.forEach((r, i) => {
      if (r.finishTime !== null || t < r.reaction) return;
      const progress = r.x / SETTINGS.distance, final = clamp((progress - .72) / .28, 0, 1);
      const launch = (r.start - .5) * 1.8 * Math.max(0, 1 - progress / .28);
      const variation = Math.sin(t * r.rhythm + r.phase) * r.consistency;
      const catchup = clamp((leaderX - r.x) / 18, 0, 1) * r.comeback * final * .7;
      const fatigue = (1 - r.stamina) ** 2 * (2.8 - r.endurance);
      const target = clamp((r.base + launch + variation + final * (1.2 + r.sprint * 2.3) + catchup - fatigue) * r.form, 9, r.max);
      const ahead = old.find((h, j) => j !== i && h.x > r.x && h.x - r.x < 5 && Math.abs(h.lane - r.lane) < .7);
      // Reserved lateral corridors never overlap. Horses lean out to pass and return,
      // with >= 2.1 world units between centres even during opposing lane changes.
      const contested = old.some((h, j) => j !== i && Math.abs(h.x - r.x) < 9);
      const laneTarget = i + (contested ? (i % 2 ? .18 : -.18) : 0);
      r.lane += clamp(laneTarget - r.lane, -STEP * .13, STEP * .13);
      const speedTarget = ahead ? Math.min(target, runners[old.indexOf(ahead)].speed) : target;
      r.speed += clamp(speedTarget - r.speed, -STEP * 3, STEP * r.acceleration);
      r.stamina = clamp(r.stamina - STEP * (.012 + Math.max(0, r.speed - r.base) * .008) / r.endurance, 0, 1);
      const dx = r.speed * STEP, remaining = SETTINGS.distance - r.x;
      const activeTime = dx >= remaining ? remaining / r.speed : STEP;
      if (progress >= .75) { r.sprintDistance += Math.min(dx, remaining); r.sprintTime += activeTime; }
      r.stride += activeTime * r.speed * 1.03;
      r.maxSpeed = Math.max(r.maxSpeed, r.speed);
      r.x = Math.min(SETTINGS.distance, r.x + dx);
      if (r.x >= SETTINGS.distance) { r.finishTime = (tick - 1) * STEP + activeTime; arrivals.push(i); }
    });
    order = runners.map((_, i) => i).sort((a, b) => {
      const x = runners[a], y = runners[b];
      if (x.finishTime !== null || y.finishTime !== null) return (x.finishTime ?? Infinity) - (y.finishTime ?? Infinity) || a - b;
      return y.x - x.x || a - b;
    });
    const ranks = new Map(order.map((i, rank) => [i, rank + 1]));
    // Count actual pair crossings, not an artificial overtaking event at the gate.
    if (t > 1) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      if (runners[a].finishTime !== null || runners[b].finishTime !== null) continue;
      const before = old[a].x - old[b].x, after = runners[a].x - runners[b].x;
      if (before * after < 0) { const win = after > 0 ? a : b, lose = after > 0 ? b : a; runners[win].overtakes++; runners[lose].passed++; }
    }
    order.forEach((i, rank) => {
      const r = runners[i];
      if (r.finishTime !== null && r.finishTime < (tick - 1) * STEP) return;
      r.positionSum += rank + 1; r.samples++; r.best = Math.min(r.best, rank + 1); r.worst = Math.max(r.worst, rank + 1);
      if (rank === 0) r.leadTime += Math.min(STEP, (r.finishTime ?? t) - (tick - 1) * STEP);
      if (tick === 60) r.startPosition = rank + 1;
      if (r.x >= SETTINGS.distance * .75 && r.gapAtSprint === null) r.gapAtSprint = runners[order[0]].x - r.x;
      r.previousRank = ranks.get(i);
    });
    if (t > 1 && order[0] !== previousLeader) {
      if (previousLeader !== -1) { events.push({ type: 'leader', time: t, participantId: runners[order[0]].id }); lastEvent = t; }
      previousLeader = order[0];
    }
    if (!finalEvent && runners[order[0]].x >= SETTINGS.distance * .85) { finalEvent = true; events.push({ type: 'sprint', time: t }); }
    if (order.length > 1 && t - lastEvent > 7 && leaderX > SETTINGS.distance * .5 && Math.abs(runners[order[0]].x - runners[order[1]].x) < .7) {
      events.push({ type: 'duel', time: t, participants: order.slice(0, 2).map(i => runners[i].id) }); lastEvent = t;
    }
    capture(t);
    if (arrivals.length === n) break;
  }
  if (arrivals.length !== n) throw new Error('Simulazione incompleta.');
  const sorted = runners.slice().sort((a, b) => a.finishTime - b.finishTime || Number(a.id) - Number(b.id));
  const results = sorted.map((r, i) => ({
    participantId: r.id, name: r.name, color: r.color, position: i + 1, time: r.finishTime,
    gap: r.finishTime - sorted[0].finishTime,
    statistics: { startPosition: r.startPosition, averagePosition: r.positionSum / r.samples,
      bestPosition: r.best, worstPosition: r.worst, overtakes: r.overtakes, overtaken: r.passed,
      timeLeading: r.leadTime, averageSpeed: SETTINGS.distance / r.finishTime, maxSpeed: r.maxSpeed,
      sprintSpeed: r.sprintTime ? r.sprintDistance / r.sprintTime : 0 }
  }));
  const photoFinish = n > 1 && results[1].gap <= SETTINGS.photoThreshold;
  if (photoFinish) events.push({ type: 'photo', time: results[1].time, gap: results[1].gap });
  return { engineVersion: ENGINE_VERSION, seed, participants, raceSettings: { ...SETTINGS }, results, events, photoFinish, duration: Math.max(...results.map(r => r.time)), frames };
}
export function sampleRace(race, seconds) {
  const t = clamp(seconds, 0, race.duration), index = Math.min(race.frames.length - 2, Math.floor(t / STEP));
  const a = race.frames[index], b = race.frames[index + 1], mix = clamp((t - a.t) / STEP, 0, 1);
  const runners = a.runners.map((r, i) => {
    const next = b.runners[i], result = race.results.find(x => x.participantId === race.participants[i].id);
    const crossed = seconds >= result.time;
    // Crossings use their exact sub-step time, including within the final tick.
    const end = result.time <= b.t ? result.time : b.t;
    const xMix = clamp((t - a.t) / Math.max(1e-9, end - a.t), 0, 1);
    return { ...r, x: crossed ? race.raceSettings.distance : r.x + (next.x - r.x) * xMix,
      lane: r.lane + (next.lane - r.lane) * mix, speed: r.speed + (next.speed - r.speed) * mix,
      stride: r.stride + (next.stride - r.stride) * mix, crossed, result, index: i };
  });
  const ordered = runners.slice().sort((a, b) => a.crossed || b.crossed
    ? (a.crossed ? a.result.time : Infinity) - (b.crossed ? b.result.time : Infinity) || a.index - b.index
    : b.x - a.x || a.index - b.index);
  return { time: t, runners, ordered, complete: seconds >= race.duration };
}
export function raceRecord(race) { const { frames, ...record } = race; return record; }
