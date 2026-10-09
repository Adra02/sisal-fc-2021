/* Local procedural race audio. No recordings, downloads, APIs or Blob calls. */
(()=>{'use strict';
function create(){
 let ctx;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();ctx.resume().catch(()=>{})}catch{return null}
 const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();master.gain.value=.65;master.connect(compressor);compressor.connect(ctx.destination);
 let muted=false,closed=false;const active=new Set();
 const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);let brown=0;
 for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.03)/1.02;data[i]=brown*3.5}
 function route(source,gain,filter,pan){const g=ctx.createGain();g.gain.value=0;source.connect(filter||g);if(filter)filter.connect(g);const p=ctx.createStereoPanner?.();if(p){p.pan.value=pan;g.connect(p);p.connect(master)}else g.connect(master);const nodes=[source,filter,g,p].filter(Boolean);active.add(source);source.onended=()=>{active.delete(source);nodes.forEach(n=>n.disconnect())};return g}
 function tone(freq,t,dur,volume,type='sine',pan=0){if(closed)return;const s=ctx.createOscillator();s.type=type;s.frequency.setValueAtTime(freq,t);const g=route(s,volume,null,pan);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.start(t);s.stop(t+dur+.02)}
 function burst(t,dur,volume,freq,pan=0){if(closed)return;const s=ctx.createBufferSource();s.buffer=noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=.7;const g=route(s,volume,f,pan);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.start(t,Math.random()*.5);s.stop(t+dur+.02)}
 function horn(rank){const now=ctx.currentTime;const notes=rank===1?[392,523.25,659.25,783.99]:[523.25,659.25];notes.forEach((f,i)=>{const t=now+i*.16;for(let h=1;h<=7;h++)tone(f*h,t,i===notes.length-1?.6:.21,.09/(h*h**.25),'sine')})}
 const api={
 get enabled(){return !muted&&ctx.state==='running'&&!closed},
 unlock(){if(!closed)ctx.resume().catch(()=>{});},
 toggle(){muted=!muted;if(!muted)api.unlock();if(!closed)master.gain.setTargetAtTime(muted?0:.65,ctx.currentTime,.025);return api.enabled},
 countdown(n){tone(n===0?1046:660,ctx.currentTime,.14,.09);},
 start(){const t=ctx.currentTime;burst(t,.16,.5,2300);[0,.035,.07].forEach(d=>tone(1600-d*1000,t+d,.12,.07,'triangle'));burst(t,.32,.28,400)},
 hoof(i){const t=ctx.currentTime,p=(i-1)*.55;tone(105+i*13,t,.085,.12,'sine',p);burst(t,.065,.24,780+i*110,p);burst(t+.02,.13,.075,2700,p)},
 ambience(){burst(ctx.currentTime,.6,.045,650);burst(ctx.currentTime,.45,.025,1800)},
 cheer(){const t=ctx.currentTime;for(let i=0;i<22;i++){burst(t+i*.09,.12,.07,1400+(i%5)*280,(i%3-1)*.65)}burst(t,.95,.18,850);burst(t+.7,.95,.12,1200)},
 finish(rank){horn(rank);burst(ctx.currentTime,.9,.14,1100)},
 pause(){if(!closed)ctx.suspend().catch(()=>{})},
 resume(){if(!closed)ctx.resume().catch(()=>{})},
 dispose(){if(closed)return;closed=true;active.forEach(s=>{try{s.stop()}catch{}});active.clear();master.disconnect();compressor.disconnect();ctx.close().catch(()=>{})}
 };return api;
}
window.SisalRaceAudio={create};
})();
