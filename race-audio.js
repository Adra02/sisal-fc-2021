/* Local procedural race audio. No recordings, downloads, APIs or Blob calls. */
(()=>{'use strict';
function create(){
 let ctx;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();ctx.resume().catch(()=>{})}catch{return null}
 const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();master.gain.value=.65;master.connect(compressor);compressor.connect(ctx.destination);
 let muted=false,closed=false;const active=new Set();
 const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);let brown=0;
 for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.03)/1.02;data[i]=brown*3.5}
 function route(source,gain,filter,pan,channel='effects'){const g=ctx.createGain();g.gain.value=0;source.connect(filter||g);if(filter)filter.connect(g);const p=ctx.createStereoPanner?.();if(p){p.pan.value=pan;g.connect(p);p.connect(master)}else g.connect(master);const nodes=[source,filter,g,p].filter(Boolean);active.add(source);source.onended=()=>{active.delete(source);nodes.forEach(n=>n.disconnect())};return g}
 function tone(freq,t,dur,volume,type='sine',pan=0,channel='effects'){if(closed)return;const s=ctx.createOscillator();s.type=type;s.frequency.setValueAtTime(freq,t);const g=route(s,volume,null,pan,channel);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.start(t);s.stop(t+dur+.02)}
 function burst(t,dur,volume,freq,pan=0,channel='effects'){if(closed)return;const s=ctx.createBufferSource();s.buffer=noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=.7;const g=route(s,volume,f,pan,channel);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.start(t,Math.random()*.5);s.stop(t+dur+.02)}
 function horn(rank){const now=ctx.currentTime;const notes=rank===1?[392,523.25,659.25,783.99]:[523.25,659.25];notes.forEach((f,i)=>{const t=now+i*.16;for(let h=1;h<=7;h++)tone(f*h,t,i===notes.length-1?.6:.21,.09/(h*h**.25),'sine')})}
 // Reusable hoof samples and an audio-clock lookahead scheduler. Rendering
 // no longer decides when each beat is played.
 const hoofBuffers=Array.from({length:4},(_,i)=>{const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.16),ctx.sampleRate),d=b.getChannelData(0);let low=0;for(let k=0;k<d.length;k++){const t=k/ctx.sampleRate,n=Math.random()*2-1;low=low*.65+n*.35;d[k]=(Math.sin(2*Math.PI*(105+i*13)*t)*.12*Math.exp(-t*65)+low*.2*Math.exp(-t*48))*Math.min(1,t/.004);}return b});
 const gaits=new Map();let paused=false;
 function stopGait(g){g.running=false;for(const s of g.sources){try{s.stop()}catch{}}g.sources.clear();}
 function schedule(){if(closed||paused||muted||ctx.state!=='running')return;const now=ctx.currentTime;for(const [i,g] of gaits){if(!g.running)continue;if(g.next<now)g.next=now+.012;while(g.next<now+.12){const s=ctx.createBufferSource();s.buffer=hoofBuffers[i%4];s.connect(g.pan);active.add(s);g.sources.add(s);s.onended=()=>{active.delete(s);g.sources.delete(s);s.disconnect()};s.start(g.next);g.next+=g.period;}}}
 const scheduler=setInterval(schedule,25);
 const api={
 get enabled(){return !muted&&ctx.state==='running'&&!closed},
 unlock(){if(!closed)ctx.resume().catch(()=>{});},
 toggle(){muted=!muted;if(!muted)api.unlock();if(!closed)master.gain.setTargetAtTime(muted?0:.65,ctx.currentTime,.025);return api.enabled},
 countdown(n){tone(n===0?1046:660,ctx.currentTime,.14,.09);},
 start(){const t=ctx.currentTime;burst(t,.16,.5,2300);[0,.035,.07].forEach(d=>tone(1600-d*1000,t+d,.12,.07,'triangle'));burst(t,.32,.28,400)},
 gallop(i,running,period=.11){if(closed)return;let g=gaits.get(i);if(!g&&!running)return;if(!g){const pan=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();if(pan.pan)pan.pan.value=Math.max(-.8,Math.min(.8,(i-1)*.4));pan.connect(master);g={pan,sources:new Set(),running:false,next:0,period};gaits.set(i,g);}g.period=Math.max(.06,Math.min(.5,period));if(!running){if(g.running)stopGait(g);return;}if(!g.running)g.next=ctx.currentTime+.02+(i%4)*.012;g.running=true;schedule();},
 tie(){const t=ctx.currentTime;[523.25,659.25,783.99].forEach((f,i)=>{tone(f,t+i*.09,.85,.075,'triangle',i===0?-.5:i===2?.5:0)});},
 medal(rank,count=1){const t=ctx.currentTime;for(let i=0;i<7;i++)burst(t+i*.055,.055,.045,900+i*160);const notes=rank===1?[523.25,659.25,783.99,1046.5]:rank===2?[440,554.37,659.25]:[349.23,440,523.25];notes.forEach((f,i)=>{tone(f,t+.35+i*.13,.65,.095,'sine');tone(f*2,t+.35+i*.13,.4,.025,'triangle')});if(count>1)tone(1318.5,t+.9,.8,.045,'sine');},
 finish(rank){horn(rank);burst(ctx.currentTime,.9,.14,1100)},
 pause(){paused=true;for(const g of gaits.values()){for(const s of g.sources){try{s.stop()}catch{}}g.sources.clear();}if(!closed)ctx.suspend().catch(()=>{})},
 resume(){paused=false;for(const g of gaits.values())g.next=ctx.currentTime+.03;if(!closed)ctx.resume().catch(()=>{})},
 dispose(){if(closed)return;closed=true;clearInterval(scheduler);active.forEach(s=>{try{s.stop()}catch{}});active.clear();gaits.forEach(g=>g.pan.disconnect());gaits.clear();master.disconnect();compressor.disconnect();ctx.close().catch(()=>{})}
 };return api;
}
window.SisalRaceAudio={create};
})();
