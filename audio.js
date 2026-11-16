/* Task 1-1: independent music/voice transport; no stage-specific sound engine. */
(function(root){'use strict';
class BeatAudio{
 constructor(){this.context=null;this.enabled=true;this.active=false;this.level=0;this.source=null;this.request=0;this.buffers=new Map();this.voiceBuffers=new Map();this.voiceLoads=new Map();this.nodes=new Set();this.error=null}
 async unlock(){
  if(!this.context){
   this.context=new (root.AudioContext||root.webkitAudioContext)();
   this.master=this.context.createGain();this.master.gain.value=.38;this.master.connect(this.context.destination);
  }
  await this.context.resume();this.setEnabled(this.enabled);
 }
 setEnabled(on){this.enabled=!!on;if(this.context)this.master.gain.setTargetAtTime(on?.38:0,this.context.currentTime,.015)}
 trackPath(level){return ['courtesy','otis','focus'][level%3]}
 async load(level){
  const path=this.trackPath(level);
  if(!this.buffers.has(path)){
   const p=fetch('assets/music/'+path+'.mp3').then(r=>{if(!r.ok)throw Error('Music unavailable: '+path);return r.arrayBuffer()})
    .then(b=>this.context.decodeAudioData(b));
   this.buffers.set(path,p);p.catch(()=>this.buffers.delete(path));
  }
  return this.buffers.get(path);
 }
 async loadVoices(){
  return Promise.all(['begin','line','triangle','square','pentagon','hexagon','death'].map(key=>{
   if(!this.voiceLoads.has(key)){
    const p=fetch('assets/voice/'+key+'.mp3').then(r=>{if(!r.ok)throw Error('Voice unavailable: '+key);return r.arrayBuffer()})
     .then(b=>this.context.decodeAudioData(b)).then(b=>{this.voiceBuffers.set(key,b)});
    this.voiceLoads.set(key,p);p.catch(()=>this.voiceLoads.delete(key));
   }
   return this.voiceLoads.get(key);
  }));
 }
 beginRun(){for(const n of this.nodes){try{n.stop()}catch{}}this.nodes.clear()}
 voice(key){
  if(!this.context||!this.enabled||!this.voiceBuffers.has(key))return false;
  const n=this.context.createBufferSource(),gain=this.context.createGain();
  n.buffer=this.voiceBuffers.get(key);gain.gain.value=1.4;n.connect(gain).connect(this.master);
  this.nodes.add(n);n.onended=()=>{this.nodes.delete(n);n.disconnect();gain.disconnect()};n.start();return true;
 }
 play(level=0,offset=0){
  if(!this.context)return;
  this.stop(true);const request=this.request;
  this.level=level;this.active=true;this.error=null;
  const start=buffer=>{
   if(!this.active||request!==this.request)return;
   const n=this.context.createBufferSource();n.buffer=buffer;n.loop=true;n.connect(this.master);
   n.start(0,Math.max(0,offset)%buffer.duration);this.source=n;
  };
  this.load(level).then(start).catch(e=>{if(request===this.request)this.error=e.message});
 }
 stop(preserveEffects=false){
  this.request++;this.active=false;
  if(this.source){try{this.source.stop()}catch{}this.source.disconnect();this.source=null}
  if(!preserveEffects)this.beginRun();
 }
 effect(kind='select'){
  if(!this.context||!this.enabled)return;
  if(kind==='die'&&this.voice('death'))return;
  if(kind==='start'&&this.voice('begin'))return;
  const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type=kind==='die'?'sawtooth':'triangle';o.frequency.setValueAtTime(kind==='die'?150:kind==='start'?660:460,t);
  g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.001,t+(kind==='die'?.25:.08));
  o.connect(g).connect(this.master);this.nodes.add(o);
  o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect()};o.start(t);o.stop(t+(kind==='die'?.26:.09));
 }
}
root.BeatAudio=BeatAudio;
})(window);
