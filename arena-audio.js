export function arenaAudio(){
 let ctx,enabled=false,nodes=new Set(),played=new Set(),lastFoot=0;
 const stop=()=>{for(const node of nodes){try{node.stop()}catch{}node.disconnect()}nodes.clear();played.clear();ctx?.suspend().catch(()=>{})};
 async function toggle(){enabled=!enabled;if(enabled){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC){enabled=false;return false}ctx ||= new AC();await ctx.resume();}else stop();return enabled}
 function play(type,distance=8){
  if(!enabled||!ctx||ctx.state!=='running')return;
  const at=ctx.currentTime,gain=ctx.createGain(),vol=Math.min(.12,1/(12+distance*2)),duration=type==='metal'?.55:type==='net'?.14:.08;
  gain.gain.setValueAtTime(vol,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);gain.connect(ctx.destination);
  let source;
  if(type==='metal'){source=ctx.createOscillator();source.frequency.setValueAtTime(480,at);source.frequency.exponentialRampToValueAtTime(310,at+.3);}
  else{const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);source=ctx.createBufferSource();source.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=type==='kick'?150:type==='touch'?220:type==='plastic'?1400:800;source.connect(filter);filter.connect(gain);}
  if(type==='metal')source.connect(gain);nodes.add(source);source.onended=()=>{nodes.delete(source);source.disconnect();gain.disconnect()};source.start(at);source.stop(at+duration+.01);
 }
 function update(frame,camera,delta){
  if(!enabled||delta>.25)return;
  for(const s of frame.sounds){const id=frame.serial+':'+s.at+':'+s.type;if(frame.t>=s.at&&frame.t<s.at+.12&&!played.has(id)){played.add(id);play(s.type,Math.hypot(camera.x-s.pos[0],camera.z-s.pos[2]))}}
  if(played.size>100)played.clear();
  if(performance.now()-lastFoot>330&&frame.actors.some(p=>p.gesture==='run'||p.gesture==='walk')){play('step',20);lastFoot=performance.now()}
 }
 return {toggle,update,stop,resume:()=>{if(enabled)ctx?.resume().catch(()=>{})},dispose:()=>{stop();ctx?.close().catch(()=>{})},get enabled(){return enabled}};
}
