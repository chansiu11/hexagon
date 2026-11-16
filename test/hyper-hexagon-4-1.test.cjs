'use strict';
/* 4-1: real uploaded 1595(3)/1596(3) source-data verification.
   Pixel-contour transcription is not proof of engine-command equivalence. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../engine.js');
const Replay=require('../replay.js');
globalThis.HexEngine=Engine;
require('../stages/hyper-hexagon.js');
const map=Engine.getMap(3);
const films={};
async function source(id){
 if(!films[id]){
  const m=map.replays[id];
  const raw=fs.readFileSync(path.join(__dirname,'..',m.path),'utf8');
  films[id]=await Replay.decode(raw,{...m,id});
 }
 return films[id];
}
test('HYPER HEXAGON is isolated from earlier maps and stage 7',()=>{
 assert.equal(Engine.LEVELS.length,6);
 assert.equal(Engine.hasMap(3),true);
 assert.equal(Engine.hasMap(6),false);
 assert.equal(map.walls.length,0);
 assert.ok(map.sourceStatus.includes('4-1'));
 assert.notEqual(map.replays['1595'].path,map.replays['1596'].path);
 assert.equal(map.replays['1595'].sourceFile,'1595(3).mp4');
 assert.equal(map.replays['1596'].sourceFile,'1596(3).mp4');
});
test('both independent source recordings contain uninterrupted pre/post-60 chronology',async()=>{
 for(const id of ['1595','1596']){
  const f=await source(id),meta=map.replays[id];
  assert.equal(f.fps,meta.sampleFps);
  assert.equal(f.fps,20,'document that 60fps full precision is still unverified');
  assert.ok(f.frames.length>1700);
  const boundary=Math.floor(60/f.gameRate*f.fps);
  assert.ok(boundary>0&&boundary<f.frames.length-1);
  assert.ok(f.frames.slice(0,boundary).some(fr=>fr.walls.length));
  assert.ok(f.frames.slice(boundary).some(fr=>fr.walls.length));
  assert.ok(f.frames[boundary-1].walls.length>0);
  assert.ok(f.frames[boundary].walls.length>0);
  assert.ok(f.frames.every(fr=>fr.walls.every(w=>w.points.length>=3)));
  // Frame records are continuous across 60; no different source is loaded.
  const g=new Engine.ArenaGame(3);
  g.attachReplay(f,{spectating:true});
  assert.equal(g.seekReplay(59.95),true);
  const before=g.replayFrame;
  assert.equal(g.seekReplay(60.05),true);
  assert.ok(g.replayFrame>before,id+' source was reset at 60s');
  assert.equal(g.replay,f);
  assert.ok(!g.timelineEnded);
  assert.ok(g.walls.length>0);
  assert.ok(g.seekReplay(Math.min(80,(f.frames.length-2)/f.fps*f.gameRate)));
  assert.ok(g.replayFrame>before);
 }
});
test('filmed wall recognition has no entire one-second no-wall dropout',async()=>{
 for(const id of ['1595','1596']){
  const f=await source(id);
  let run=0,maxRun=0;
  for(const frame of f.frames){
   run=frame.walls.length===0?run+1:0;
   maxRun=Math.max(maxRun,run);
  }
  assert.ok(maxRun*f.gameRate/f.fps<=1,
    'unseen walls or missing geometry for >1 second: '+id);
 }
});
test('real geometry can be passed through an open sector and touched at a blocked sector',async()=>{
 const TAU=Math.PI*2,hitPoint=(a)=>[Engine.ORBIT*Math.cos(a),Engine.ORBIT*Math.sin(a)];
 for(const id of ['1595','1596']){
  const f=await source(id),g=new Engine.ArenaGame(3);
  g.attachReplay(f);
  let found=null;
  for(let i=40;i<f.frames.length-2&&!found;i+=5){
   const walls=f.frames[i].walls,angles=[];
   for(let a=0;a<120;a++){
    const angle=(a+.5)*TAU/120,[x,y]=hitPoint(angle);
    angles.push({angle,hit:walls.some(w=>
      Engine.pointInsidePolygon(x,y,w.points)&&
      !(w.holes||[]).some(h=>Engine.pointInsidePolygon(x,y,h)))});
   }
   const safe=angles.find(a=>!a.hit),blocked=angles.find(a=>a.hit);
   if(safe&&blocked)found={time:i/f.fps*f.gameRate,safe:safe.angle,blocked:blocked.angle};
  }
  assert.ok(found,'filmed actor never visits ship orbit for '+id);
  assert.equal(g.seekReplay(found.time),true);
  g.angle=found.safe;
  assert.equal(g.checkCollision(),false,'safe open lane blocked in '+id);
  g.angle=found.blocked;
  assert.equal(g.checkCollision(),true,'recorded wall not lethal in '+id);
  assert.ok(g.death?.wallId);
  const next=g.reset();
  next.attachReplay(f,{spectating:true});
  assert.equal(next.dead,false);
  assert.ok(next.seekReplay(60.01));
 }
});

test('real-stage intro is not killed by falsely detected background wedges',async()=>{
 for(const id of ['1595','1596']){
  const film=await source(id);
  const game=new Engine.ArenaGame(3);
  game.attachReplay(film); // non-spectator collision checks are enabled.
  assert.equal(game.spectating,false);
  for(let i=0;i<170;i++){
   game.update(1/240,0);
   assert.equal(game.dead,false,'false opening collision from source '+id+' at '+game.time);
  }
  const first=film.frames.findIndex(f=>f.walls.length>0);
  assert.ok(first>=1&&first/film.fps*film.gameRate<1,
   'first confirmed wall is not present within one game second: '+id);
 }
});
