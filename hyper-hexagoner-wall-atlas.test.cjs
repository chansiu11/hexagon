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