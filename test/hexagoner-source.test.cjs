'use strict';
// Task 2-1: deterministic filmed source order (not randomized phrase stitching).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const HexEngine=require('../engine.js');
const HexReplay=require('../replay.js');
global.HexEngine=HexEngine;
require('../stages/hexagon.js');
require('../stages/hexagoner.js');
const film={1595:{frames:1941,start:177.96,end:275.01},1596:{frames:2090,start:119.30,end:223.80}};
test('only HEXAGON and HEXAGONER are available; former 7th map stays removed',()=>{
 assert.equal(HexEngine.LEVELS.length,6);
 assert.equal(HexEngine.hasMap(0),true);
 assert.equal(HexEngine.hasMap(1),true);
 for(let i=2;i<6;i++)assert.equal(HexEngine.hasMap(i),false);
 assert.equal(HexEngine.hasMap(6),false);
 const stage=HexEngine.getMap(1);
 assert.equal(stage.sourceStatus,'video-contour-37-dodge-phrases-task2-2');
 assert.equal(stage.walls.length,0,'no legacy HEXAGONER procedural walls');
 assert.equal(stage.playerSpeed,8.2,'HEXAGONER movement is independent of HEXAGON');
 assert.deepEqual(Object.keys(stage.replays),['1595','1596']);
});
for(const [id,expectation] of Object.entries(film)){
 test(id+': independent 20fps observed contours preserve chronological 0–60 and 60+ frames',async()=>{
  const input=fs.readFileSync('data/hexagoner-'+id+'.b64','utf8');
  const replay=await HexReplay.decode(input,{...HexEngine.getMap(1).replays[id],id});
  assert.equal(replay.fps,20);
  assert.equal(replay.frames.length,expectation.frames);
  assert.equal(replay.sourceStart,expectation.start);
  assert.equal(replay.sourceEnd,expectation.end);
  const duration=(replay.frames.length-1)/replay.fps*replay.gameRate;
  assert.ok(duration>100&&duration<112);
  const firstHourFrames=replay.frames.slice(0,1152); // gameTime ~= frame * 25/(24*20)
  const laterFrames=replay.frames.slice(1152);
  assert.ok(firstHourFrames.length>1000&&laterFrames.length>500);
  for(const [index,frame] of replay.frames.entries()){
   assert.ok(Number.isFinite(frame.angle)&&Number.isFinite(frame.zoom));
   assert.equal(frame.sides,6,'6 sides provisional: no unverified morph claims');
   const ids=frame.walls.map(w=>w.id);
   assert.equal(new Set(ids).size,ids.length,'duplicate polygon in frame '+index);
   for(const wall of frame.walls){
    assert.ok(wall.points.length>=3&&wall.points.every(p=>p.length===2&&p.every(Number.isFinite)));
   }
  }
  assert.ok(firstHourFrames.filter(f=>f.walls.length>0).length>1000);
  assert.ok(laterFrames.filter(f=>f.walls.length>0).length>400);
  // 60s must remain adjacent frames in the same video stream, not restart or drop.
  const g=new HexEngine.ArenaGame(1);
  g.attachReplay(replay,{spectating:true});
  assert.equal(g.seekReplay(59.9),true);
  const frame59=g.replayFrame;
  assert.ok(g.walls.length>0);
  g.update(.2);
  assert.ok(g.time>=60.1-1e-4&&g.replayFrame>frame59);
  assert.ok(g.walls.length>0);
  const frame60=g.replayFrame;
  g.update(.1);
  assert.ok(g.replayFrame>frame60,'source frames continue after 60');
  g.seekReplay(duration-.1);
  g.update(.4);
  assert.equal(g.timelineEnded,true);
  const frozen=g.time;g.update(.5);assert.equal(g.time,frozen);
 });
}
test('stage zero filmed traces retain a disjoint archive and do not share HEXAGONER walls',async()=>{
 const original=HexEngine.getMap(0);
 const stage=HexEngine.getMap(1);
 for(const id of ['1595','1596']){
  assert.notEqual(original.replays[id].path,stage.replays[id].path);
  const pal=JSON.parse(fs.readFileSync('data/hexagoner-'+id+'-palette.json','utf8'));
  assert.equal(pal.fps,4);
  assert.ok(pal.colors.length>300);
  assert.ok(pal.colors.every(c=>c.length===9&&c.every(Number.isFinite)));
 }
});
