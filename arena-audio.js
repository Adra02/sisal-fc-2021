export function arenaAudio(){
 let ctx,enabled=false,nodes=new Set(),played=new Set(),feet=new Map(),lastFoot=0;
 const stop=()=>{for(const node of nodes){try{node.stop()}catch{}node.disconnect()}nodes.clear();played.clear();feet.clear();ctx?.suspend().catch(()=>{})};
 async function toggle(){enabled=!enabled;if(enabled){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC){enabled=false;return false}ctx ||= new AC();await ctx.resume();}else stop();return enabled}
 function play(type,distance=8){
  if(!enabled||!ctx||ctx.state!=='running')return;
  const at=ctx.currentTime,gain=ctx.createGain(),vol=Math.min(.12,1/(12+distance*2)),duration=type==='metal'?.55:type==='whistle'?.19:type==='net'?.14:.08;
  gain.gain.setValueAtTime(vol,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);gain.connect(ctx.destination);
  let source;
  if(type==='metal'||type==='whistle'){source=ctx.createOscillator();source.frequency.setValueAtTime(type==='whistle'?2200:480,at);source.frequency.exponentialRampToValueAtTime(type==='whistle'?1900:310,at+duration*.7);}
  else{const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);source=ctx.createBufferSource();source.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=type==='kick'?150:type==='touch'?220:type==='plastic'?1400:800;source.connect(filter);filter.connect(gain);}
  if(type==='metal'||type==='whistle')source.connect(gain);nodes.add(source);source.onended=()=>{nodes.delete(source);source.disconnect();gain.disconnect()};source.start(at);source.stop(at+duration+.01);
 }
 function update(frame,camera,delta){
  if(!enabled||delta>.25)return;
  for(const s of frame.sounds){const id=frame.serial+':'+s.at+':'+s.type;if(frame.t>=s.at&&frame.t<s.at+.12&&!played.has(id)){played.add(id);play(s.type,Math.hypot(camera.x-s.pos[0],camera.z-s.pos[2]))}}
  if(played.size>100)played.clear();
  // Footfalls follow the nearest moving actors' distance-driven gait instead
  // of a single metronome shared by the whole squad.
  const nearest=frame.actors.filter(p=>Math.hypot(...p.velocity)>.15).map(p=>({p,d:Math.hypot(camera.x-p.pos[0],camera.z-p.pos[1])})).sort((a,b)=>a.d-b.d).slice(0,2);
  for(const {p,d}of nearest){const beat=Math.floor(p.stepCycle*2),old=feet.get(p.key);feet.set(p.key,beat);if(old!=null&&beat!==old&&performance.now()-lastFoot>85){play('step',d);lastFoot=performance.now();}}

 }
 return {toggle,update,stop,resume:()=>{if(enabled)ctx?.resume().catch(()=>{})},dispose:()=>{stop();ctx?.close().catch(()=>{})},get enabled(){return enabled}};
}
