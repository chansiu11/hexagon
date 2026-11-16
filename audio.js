/* New lightweight audio transport. Does not import legacy gameplay timings. */
(function(root){
'use strict';
class HexAudio {
  constructor(){this.enabled=true;this.ctx=null;this.master=null;this.track=null;this.request=0;this.buffers=new Map();this.voices=new Map();this.error=null;}
  async unlock(){
    if(!this.ctx){const C=root.AudioContext||root.webkitAudioContext;if(!C)throw new Error('Web Audio unsupported');
      this.ctx=new C();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);}
    await this.ctx.resume();this.setEnabled(this.enabled);
  }
  setEnabled(on){this.enabled=!!on;if(this.master)this.master.gain.setTargetAtTime(on?.34:0,this.ctx.currentTime,.015);}
  async buffer(path){
    if(!this.buffers.has(path)){const promise=fetch(path).then(r=>{if(!r.ok)throw new Error(path+' '+r.status);return r.arrayBuffer();}).then(data=>this.ctx.decodeAudioData(data));
      this.buffers.set(path,promise);promise.catch(()=>this.buffers.delete(path));}
    return this.buffers.get(path);
  }
  stop(){++this.request;if(this.track){try{this.track.stop();}catch{}this.track.disconnect();this.track=null;}}
  async play(level,offset=0){
    this.stop();if(!this.enabled||!this.ctx)return;
    const ticket=this.request;
    const file=['courtesy','otis','focus'][level%3];
    try{const buffer=await this.buffer('assets/music/'+file+'.mp3');
      if(ticket!==this.request||!this.enabled)return;
      const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.master);
      source.start(0,Math.max(0,offset)%buffer.duration);this.track=source;this.error=null;
    }catch(err){this.error=String(err);}
  }
  async voice(name){
    if(!this.enabled||!this.ctx)return;
    try{
      const b=await this.buffer('assets/voice/'+name+'.mp3');
      if(!this.enabled)return;
      const source=this.ctx.createBufferSource();source.buffer=b;source.connect(this.master);source.start();
      source.onended=()=>source.disconnect();
    }catch(err){this.error=String(err);}
  }
  tone(freq=480){if(!this.ctx||!this.enabled)return;
    const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.08,t);
    g.gain.exponentialRampToValueAtTime(.001,t+.055);
    o.connect(g).connect(this.master);o.start();o.stop(t+.06);
  }
  select(){this.tone();}
  death(){this.stop();this.voice('death');}
}
root.HexAudio=HexAudio;
})(window);
