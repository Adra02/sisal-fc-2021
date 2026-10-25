// Local contact sounds. No downloads, speech or paid service.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function impactPCM(type,sampleRate=22050,seed=1){
 const duration=type==='metal'?.65:type==='whistle'?.23:type==='net'?.22:type==='save'?.20:type==='kick'?.18:.12,data=new Float32Array(Math.ceil(duration*sampleRate));let rng=seed||1,low=0,mean=0,peak=0;
 for(let i=0;i<data.length;i++){
  rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;const noise=(rng>>>0)/2147483648-1,t=i/sampleRate,attack=Math.min(1,t/.0025);low+=(noise-low)*.13;let v;
  if(type==='metal')v=(Math.sin(t*2*Math.PI*510)*Math.exp(-t*9)+Math.sin(t*2*Math.PI*843)*Math.exp(-t*12)*.6+Math.sin(t*2*Math.PI*1379)*Math.exp(-t*18)*.35+noise*Math.exp(-t*100)*.4)*.35;
  else if(type==='whistle')v=(Math.sin(t*2*Math.PI*2240+Math.sin(t*2*Math.PI*38)*.9)+.18*Math.sin(t*2*Math.PI*4480))*Math.sin(Math.PI*t/duration)**.6*.28;
  else if(type==='kick')v=Math.sin(2*Math.PI*(135*t-90*t*t))*Math.exp(-t*30)*.65+low*Math.exp(-t*45)*.75+noise*Math.exp(-t*280)*.23;
  else if(type==='touch')v=Math.sin(t*2*Math.PI*108)*Math.exp(-t*43)*.30+low*Math.exp(-t*65)*.60;
  else if(type==='bounce')v=Math.sin(t*2*Math.PI*87)*Math.exp(-t*37)*.32+low*Math.exp(-t*55)*.40;
  else if(type==='save')v=Math.sin(t*2*Math.PI*82)*Math.exp(-t*30)*.35+noise*Math.exp(-t*72)*.45+low*Math.exp(-t*34)*.25;
  else if(type==='net')v=(noise-low)*Math.exp(-t*20)*.20+low*Math.exp(-t*30)*.15;
  else if(type==='throw')v=low*Math.sin(Math.PI*t/duration)*Math.exp(-t*20)*.28;
  else v=low*Math.exp(-t*38)*.28+(noise-low)*Math.exp(-t*75)*.08;
  v*=attack*Math.min(1,(duration-t)/.008);data[i]=v;mean+=v;
 }
 mean/=data.length;for(let i=0;i<data.length;i++){data[i]-=mean;peak=Math.max(peak,Math.abs(data[i]));}const gain=peak>.82?.82/peak:1;for(let i=0;i<data.length;i++)data[i]*=gain;return data;
}
export function arenaAudio({volume=.65}={}){
 let ctx,master,enabled=false,disposed=false,activating=null,lastTime=null,lastFoot=0,level=clamp(volume);const voices=new Set(),played=new Map(),feet=new Map(),buffers=new Map();
 const clearVoices=()=>{for(const v of voices){try{v.source.stop()}catch{}for(const n of v.nodes)try{n.disconnect()}catch{}}voices.clear();};
 function stop(){clearVoices();played.clear();feet.clear();lastTime=null;ctx?.suspend().catch(()=>{});}
 async function toggle(){
  if(disposed)return false;if(activating)return activating;if(enabled){enabled=false;stop();return false;}
  activating=(async()=>{try{const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return false;
   if(!ctx){ctx=new AC();master=ctx.createGain();master.gain.value=level;const limiter=ctx.createDynamicsCompressor?.();if(limiter){limiter.threshold.value=-12;limiter.knee.value=9;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;master.connect(limiter);limiter.connect(ctx.destination);}else master.connect(ctx.destination);}
   await ctx.resume();enabled=ctx.state==='running';return enabled;
  }catch{enabled=false;return false;}})().finally(()=>{activating=null;});return activating;
 }
 function buffer(type,seed){const key=type+':'+(seed%8);if(!buffers.has(key)){const data=impactPCM(type,ctx.sampleRate,seed),b=ctx.createBuffer(1,data.length,ctx.sampleRate);b.getChannelData(0).set(data);buffers.set(key,b);if(buffers.size>96)buffers.delete(buffers.keys().next().value);}return buffers.get(key);}
 function play(type,position,camera,intensity=.55,seed=1){
  if(!enabled||!ctx||ctx.state!=='running'||disposed)return;if(voices.size>=12){if(type==='step')return;const oldest=[...voices].find(v=>v.type==='step')||voices.values().next().value;try{oldest.source.stop()}catch{}for(const n of oldest.nodes)n.disconnect();voices.delete(oldest);}
  const dx=position[0]-camera.x,dy=(position[1]||0)-(camera.y||1.6),dz=position[2]-camera.z,d=Math.hypot(dx,dy,dz),gain=ctx.createGain(),source=ctx.createBufferSource(),nodes=[source,gain];source.buffer=buffer(type,seed);
  gain.gain.value=clamp(intensity,.08,1)*(type==='step'?.30:.85)/(1+d*.065);source.connect(gain);
  if(ctx.createStereoPanner){const pan=ctx.createStereoPanner();pan.pan.value=clamp((dx*(camera.rightX??1)+dz*(camera.rightZ??0))/Math.max(4,d),-.9,.9);gain.connect(pan);pan.connect(master);nodes.push(pan);}else gain.connect(master);
  const voice={source,nodes,type};voices.add(voice);source.onended=()=>{voices.delete(voice);for(const n of nodes)try{n.disconnect()}catch{}};source.start(ctx.currentTime);
 }
 function update(frame,camera,delta){
  const time=frame.t,jump=lastTime!=null&&(time-lastTime>.40||time<lastTime);if(jump){clearVoices();played.clear();feet.clear();}lastTime=time;
  if(!enabled||jump||delta>.35)return;
  for(const s of frame.sounds||[]){const id=s.id??frame.serial+':'+s.at+':'+s.type;if(time>=s.at&&time-s.at<.18&&!played.has(id)){played.set(id,time);play(s.type,s.pos,camera,s.intensity??.55,hash(id+':'+(s.surface||'')));}}
  for(const [id,at]of played)if(time-at>2)played.delete(id);
  const moving=(frame.actors||[]).filter(p=>Math.hypot(...p.velocity)>.6&&!p.seated).map(p=>({p,d:Math.hypot(camera.x-p.pos[0],camera.z-p.pos[1])})).filter(x=>x.d<18).sort((a,b)=>a.d-b.d).slice(0,2);
  for(const {p}of moving){const beat=Math.floor(p.stepCycle*2),old=feet.get(p.key);feet.set(p.key,beat);if(old!=null&&beat!==old&&time-lastFoot>.11){play('step',[p.pos[0],0,p.pos[1]],camera,.35,hash(p.key+beat));lastFoot=time;}}
 }
 return {toggle,update,stop,setVolume:v=>{level=clamp(v);if(master)master.gain.value=level;},resume:()=>{if(enabled&&!disposed)ctx?.resume().catch(()=>{enabled=false;});},dispose:()=>{if(disposed)return;disposed=true;enabled=false;stop();buffers.clear();master?.disconnect();ctx?.close().catch(()=>{});},get enabled(){return enabled&&ctx?.state==='running';},get volume(){return level;}};
}
