// Production accepts only shared continuous worlds. The old entry points remain
// available for historical fixtures and rollback tests; UI never requests them.
import {sampleContinuous,prewarmContinuous} from './arena-live-cache.js?v=arena-6';
import {sampleArena as priorSample,prewarmArena as priorPrewarm} from './arena-program-compat.js?v=arena-6';
export * from './arena-program-compat.js?v=arena-6';
export function sampleArena(snapshot,seconds,forced){return snapshot.world?sampleContinuous(snapshot,seconds):priorSample(snapshot,seconds,forced);}
export async function prewarmArena(snapshot,seconds,options){return snapshot.world?prewarmContinuous(snapshot,seconds,options):priorPrewarm(snapshot,seconds,options);}
