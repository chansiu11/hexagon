'use strict';
// Executable real-source regression for HEXAGONEST task 3-1 (not a claim
// of pixel-identical fidelity or a substitute for manual film comparison).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../engine.js');
const Replay=require('../replay.js');
const Source=require('../hexagonest-source.js');
const Chronology=require('../hexagonest-chronology.js');
const root=path.join(__dirname,'..');
let loaded;
async function sources(){
 if(loaded)return loaded;
 loaded=(async()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/hexagonest-sources.json'),'utf8'));
  const replays=Source.checkManifest(manifest);
  const films={};
  for(const id of Source.IDS){
   const raw=fs.readFileSync(path.join(root,replays[id].path),'utf8');
   films[id]=await Replay.decode(raw,{...replays[id],id});
  }
  const report=Source.checkRecordings(films,replays,Chronology);
  return {manifest,replays,films,report};
 })();
 return loaded;
}
test('both complete, distinct 60s+ films actually decode and audit',async()=>{
 const {films,replays,report}=await sources();
 for(const id of Source.IDS){
  const film=films[id];
  const info=report['source'+id];
  assert.equal(film.fps,replays[id].sampleFps);
  assert.ok(info.frames>1000);
  assert.ok(info.endSecond>60);
  assert.ok(info.birthsBefore60>0);
  assert.ok(info.birthsAfter60>0);
  // The same descending wall must still be tracked on both sides of 60s;
  // earlier white-HUD misclassification broke this identity for film 1595.
  assert.ok(info.actorsContinuousAt60.length>0,
    'HEXAGONEST wall identity breaks exactly at 60s in film '+id);
  assert.equal(film.fps,60,'real video trace must preserve full 60fps cadence');
  assert.ok(Number.isFinite(info.minWallRadius));
  assert.ok(film.frames[Math.round(60/film.gameRate*film.fps)].walls.length>0);
  assert.ok(film.frames.every(f=>Array.isArray(f.walls)));
 }
 assert.notEqual(films['1595'],films['1596']);
});
test('stage 3 accepts video geometry and first second is not instant-death',async()=>{
 const {manifest,films}=await sources();
 const registry=Source.install({manifest,recordings:films,engine:Engine,chronology:Chronology});
 assert.ok(registry.ready);
 assert.equal(Engine.hasMap(2),true);
 for(const id of Source.IDS){
  const game=new Engine.ArenaGame(2);
  game.attachReplay(films[id]);
  assert.equal(game.dead,false);
  game.update(.5,0);
  assert.equal(game.dead,false,'unexpected death inside initial source opening '+id);
  assert.ok(game.seekReplay(59.95));
  assert.ok(game.seekReplay(60.05));
  assert.equal(game.timelineEnded,false);
  assert.ok(game.walls.every(w=>w.points.length>=3));
 }
});
test('reference frames never fully seal the player orbit',async()=>{
 const {films}=await sources();
 const TAU=Math.PI*2,angles=Array.from({length:120},(_,i)=>i*TAU/120);
 for(const id of Source.IDS){
  let checked=0;
  for(let i=0;i<films[id].frames.length;i+=10){
   const frame=films[id].frames[i],occupied=angles.map(a=>{
    const x=Engine.ORBIT*Math.cos(a),y=Engine.ORBIT*Math.sin(a);
    return frame.walls.some(w=>Engine.pointInsidePolygon(x,y,w.points)&&
      !(w.holes||[]).some(h=>Engine.pointInsidePolygon(x,y,h)));
   });
   assert.ok(occupied.some(x=>!x),id+' orbit sealed at film frame '+i);
   checked++;
  }
  assert.ok(checked>100);
 }
});
