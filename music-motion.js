/* Stage-seven view only: tempo, musical energy and bass drive one shared
   camera. World angles, wall clocks and collision polygons never change. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const smooth=(a,b,dt,tau)=>a+(b-a)*(1-Math.exp(-dt/tau));
class Motion{
 constructor(){this.drive=0;this.rotationScale=1;this.amplitude=0;this.shakeX=0;this.shakeY=0;this.speed=0;this.beatIndex=null;}
 update(dt,time,track,features={},enabled=true){
  dt=clamp(dt,0,.1);time=Number.isFinite(time)?time:0;
  const tempo=clamp(((track?.bpm||130)-120)/60,0,1.5);
  const active=enabled&&features.active===true;
  const energy=active?clamp((features.energy-.008)/.22):0;
  const bass=active?clamp(features.bass/.14):0;
  const brightness=active?clamp(features.brightness):0;
  const pulse=active?clamp(features.pulse):0;
  const targetDrive=.60*energy+.30*bass+.10*brightness;
  this.drive=smooth(this.drive,targetDrive,dt,targetDrive>this.drive?.10:.65);
  const targetScale=enabled?clamp(.52+.36*tempo+.64*this.drive+.08*pulse,.48,1.65):1;
  const beatIndex=Math.floor((time-(track?.phase||0))*(track?.bpm||130)/30);
  if(beatIndex!==this.beatIndex||!enabled){
   this.rotationScale=targetScale*(enabled?(beatIndex%2===0?1.08:.92):1);
   this.beatIndex=beatIndex;
  }
  const intensity=active?clamp((.48*energy+.27*bass+.75*pulse)*(.65+.65*tempo)):0;
  const targetAmplitude=4.5*intensity*Math.min(1,Math.max(0,time)/1.2);
  this.amplitude=smooth(this.amplitude,targetAmplitude,dt,targetAmplitude>this.amplitude?.025:.14);
  // All harmonics follow the selected song's real beat phase. Damping keeps
  // strong kicks readable without random position jumps or opacity flashes.
  const phase=(time-(track?.phase||0))*(track?.bpm||130)*TAU/60;
  const x=this.amplitude*(.65*Math.sin(phase*2)+.35*Math.sin(phase*3+1));
  const y=this.amplitude*(.65*Math.sin(phase*2+1.7)+.35*Math.sin(phase*4));
  this.shakeX=smooth(this.shakeX,x,dt,.035);
  this.shakeY=smooth(this.shakeY,y,dt,.035);
  return {rotationScale:this.rotationScale,shakeX:enabled?this.shakeX:0,
   shakeY:enabled?this.shakeY:0,energy:this.drive,amplitude:this.amplitude};
 }
}
function apply(game,dt,baseDelta,features,enabled=true){
 if(game?.level!==6||!game.timeline?.musicTrack)return null;
 const motion=game.musicMotionState||(game.musicMotionState=new Motion());
 const state=motion.update(dt,game.time,game.timeline.musicTrack,features,enabled);
 // Integrate the new visual velocity; multiplying an accumulated angle
 // would make the entire scene jump when a loud section begins.
 const wanted=dt>0?clamp(baseDelta/dt*state.rotationScale,-6.8,6.8):0;
 motion.speed=wanted;
 if(!Number.isFinite(game.musicRotation))game.musicRotation=game.rotation-baseDelta;
 game.musicRotation+=motion.speed*Math.max(0,dt);
 game.musicMotion=state;return state;
}
const API={Motion,apply};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexMusicMotion=API;
})(typeof window!=='undefined'?window:globalThis);
