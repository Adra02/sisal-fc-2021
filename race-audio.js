/* Local procedural race audio. No recordings, downloads, APIs or Blob calls. */
(()=>{'use strict';
function create(){
 let ctx;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();ctx.resume().catch(()=>{})}catch{return null}
 const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();master.gain.value=.65;master.connect(compressor);compressor.connect(ctx.destination);
 let muted=false,closed=false;const active=new Set();
 const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);let brown=0;
 for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.03)/1.02;data[i]=brown*3.5}
 const clapNoise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.2),ctx.sampleRate),clapData=clapNoise.getChannelData(0);
 for(let i=0;i<clapData.length;i++)clapData[i]=Math.random()*2-1;
 const reverb=ctx.createConvolver(),room=ctx.createGain();room.gain.value=.12;
 const impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*.45),ctx.sampleRate);
 for(let c=0;c<2;c++){const d=impulse.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.22}
 reverb.buffer=impulse;master.connect(room);room.connect(reverb);reverb.connect(compressor);
 function route(source,gain,filter,pan){const g=ctx.createGain();g.gain.value=0;source.connect(filter||g);if(filter)filter.connect(g);const p=ctx.createStereoPanner?.();if(p){p.pan.value=pan;g.connect(p);p.connect(master)}else g.connect(master);const nodes=[source,filter,g,p].filter(Boolean);active.add(source);source.onended=()=>{active.delete(source);nodes.forEach(n=>n.disconnect())};return g}
 function tone(freq,t,dur,volume,type='sine',pan=0){if(closed)return;const s=ctx.createOscillator();s.type=type;s.frequency.setValueAtTime(freq,t);const g=route(s,volume,null,pan);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.start(t);s.stop(t+dur+.02)}
 function burst(t,dur,volume,freq,pan=0){if(closed)return;const s=ctx.createBufferSource();s.buffer=noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=.7;const g=route(s,volume,f,pan);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.start(t,Math.random()*.5);s.stop(t+dur+.02)}
 function horn(rank){const now=ctx.currentTime;const notes=rank===1?[392,523.25,659.25,783.99]:[523.25,659.25];notes.forEach((f,i)=>{const t=now+i*.16;for(let h=1;h<=7;h++)tone(f*h,t,i===notes.length-1?.6:.21,.09/(h*h**.25),'sine')})}
 function clap(t,volume,pan){if(closed)return;const s=ctx.createBufferSource();s.buffer=clapNoise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1600+Math.random()*1400;f.Q.value=.6;const g=route(s,volume,f,pan);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+.08);s.start(t);s.stop(t+.09)}
 // Formant-filtered voices: locally synthesized crowd vowels, not recordings.
 function voice(t,energy,pan){if(closed)return;const source=ctx.createOscillator(),gain=ctx.createGain(),stereo=ctx.createStereoPanner?.();
   const pitch=115+Math.random()*145,duration=.48+Math.random()*.55;source.type='sawtooth';source.frequency.setValueAtTime(pitch,t);source.frequency.linearRampToValueAtTime(pitch*(1.12+Math.random()*.13),t+.18);source.frequency.linearRampToValueAtTime(pitch*.94,t+duration);
   const filters=[650,1050,2450].map((hz,i)=>{const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=hz*(.85+Math.random()*.3);f.Q.value=i===2?5:3.5;source.connect(f);f.connect(gain);return f});
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055*energy,t+.07);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   if(stereo){stereo.pan.value=pan;gain.connect(stereo);stereo.connect(master)}else gain.connect(master);
   active.add(source);source.onended=()=>{active.delete(source);[source,gain,stereo,...filters].filter(Boolean).forEach(n=>n.disconnect())};source.start(t);source.stop(t+duration+.02);
 }
 function whistle(t){if(closed)return;const f=1900+Math.random()*500;tone(f,t,.22,.016,'sine',Math.random()*1.6-.8);tone(f*1.06,t+.14,.29,.01,'sine')}
 const api={
 get enabled(){return !muted&&ctx.state==='running'&&!closed},
 unlock(){if(!closed)ctx.resume().catch(()=>{});},
 toggle(){muted=!muted;if(!muted)api.unlock();if(!closed)master.gain.setTargetAtTime(muted?0:.65,ctx.currentTime,.025);return api.enabled},
 countdown(n){tone(n===0?1046:660,ctx.currentTime,.14,.09);},
 start(){const t=ctx.currentTime;burst(t,.16,.5,2300);[0,.035,.07].forEach(d=>tone(1600-d*1000,t+d,.12,.07,'triangle'));burst(t,.32,.28,400)},
 hoof(i){const t=ctx.currentTime,p=Math.max(-.8,Math.min(.8,(i-1)*.4));tone(105+i*13,t,.085,.12,'sine',p);burst(t,.065,.24,780+i*110,p);burst(t+.02,.13,.075,2700,p)},
 ambience(energy=.4){if(closed||ctx.state!=='running')return;const t=ctx.currentTime;burst(t,.65,.025,650);voice(t+.02,.28+energy*.55,Math.random()*1.6-.8);if(Math.random()<energy*.6){clap(t+.13,.045,Math.random()*1.5-.75);clap(t+.29,.04,Math.random()*1.5-.75)}if(Math.random()<energy*.13)whistle(t+.1)},
 cheer(){if(closed)return;const t=ctx.currentTime;for(let i=0;i<14;i++)clap(t+i*(.08+Math.random()*.05),.055+Math.random()*.025,Math.random()*1.6-.8);for(let i=0;i<7;i++)voice(t+Math.random()*.75,.6+Math.random()*.3,Math.random()*1.6-.8);whistle(t+.3);burst(t,.95,.07,850)},
 tie(){const t=ctx.currentTime;[523.25,659.25,783.99].forEach((f,i)=>{tone(f,t+i*.09,.85,.075,'triangle',i===0?-.5:i===2?.5:0)});},
 medal(rank,count=1){const t=ctx.currentTime;for(let i=0;i<7;i++)burst(t+i*.055,.055,.045,900+i*160);const notes=rank===1?[523.25,659.25,783.99,1046.5]:rank===2?[440,554.37,659.25]:[349.23,440,523.25];notes.forEach((f,i)=>{tone(f,t+.35+i*.13,.65,.095,'sine');tone(f*2,t+.35+i*.13,.4,.025,'triangle')});if(count>1)tone(1318.5,t+.9,.8,.045,'sine');},
 finish(rank){horn(rank);burst(ctx.currentTime,.9,.14,1100)},
 pause(){if(!closed)ctx.suspend().catch(()=>{})},
 resume(){if(!closed)ctx.resume().catch(()=>{})},
 dispose(){if(closed)return;closed=true;active.forEach(s=>{try{s.stop()}catch{}});active.clear();master.disconnect();room.disconnect();reverb.disconnect();compressor.disconnect();ctx.close().catch(()=>{})}
 };return api;
}
window.SisalRaceAudio={create};
})();
