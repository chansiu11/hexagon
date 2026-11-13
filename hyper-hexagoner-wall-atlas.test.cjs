'use strict';
// The 60fps wall atlas is measured from the user's attached gameplay, not a
// screenshot movie of HUD/player. It must decode completely and remain in
// source-video order. No timing/direction interpolation can invent a wall.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const atlas=require('./hyper-hexagoner-wall-atlas.js');
const D=require('./hyper-hexagoner-910-data.js');
async function run(){
 const nativeFetch=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,text:async()=>fs.readFileSync(
  path.join(__dirname,'hyper-hexagoner-filmed-walls-60fps.b64'),'utf8')});
 try{
  assert.equal(await atlas.load(),true);
  assert.equal(atlas.ready,true);
  assert.equal(atlas.FPS,60);
  assert.equal(atlas.loadedFrameCount,5079);
  assert.equal(atlas.getFrame(atlas.START).index,0);
  // A large center-hex outline from the first animation must not
  // reappear as a moving wall ring. The same geometry later in the
  // run must NOT be suppressed as an actual approaching wall.
  const centerHex=Array.from({length:6},(_,i)=>{
   const a=i*Math.PI/3;
   return [Math.round(288+155*Math.cos(a)),Math.round(180+155*Math.sin(a))];
  }).flat();
  assert.equal(atlas.isCoreOutline(centerHex,atlas.START+.1),true,
   'large intro core outline accidentally drawn as a wall');
  assert.equal(atlas.isCoreOutline(centerHex,atlas.START+1),false,
   'normal gameplay ring should not be filtered by intro-only rule');
  const wedge=[288+85,180-30,288+210,180-35,288+210,180+35,288+85,180+30,
   288+85,180-30,288+210,180-35];
  assert.equal(atlas.isCoreOutline(wedge,atlas.START+.1),false,
   'a partial exterior wedge is a wall, not a full center ring');
  const samples=[403.47,407.4,419,432,449,467,474,484,488.1];
  for(const t of samples){
   const fr=atlas.getFrame(t);
   assert(fr&&fr.rgb.length===3&&fr.paths.length>0,'missing source video frame '+t);
   for(const rgb of fr.rgb)assert(Number.isInteger(rgb)&&rgb>=0&&rgb<=255);
   assert(fr.paths.every(poly=>poly.length>=6&&poly.length%2===0&&
    poly.every(v=>Number.isInteger(v)&&v>=0&&v<=576)),'bad wall silhouette');
   const hud=D.gameTimeAtVideo(t);
   assert(Math.abs(D.videoAtGameTime(hud)-t)<.002,'video/HUD mapping drift '+t);
  }
  assert.equal(atlas.getFrame(488.1).index,5078);
  console.log('PASS 5079 filmed wall frames at 60fps; source colors, silhouettes and HUD mapping');
 }finally{globalThis.fetch=nativeFetch;}
}
run().catch(e=>{console.error(e);process.exitCode=1});