'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const HexEngine=require('../engine.js'),HexReplay=require('../replay.js');
global.HexEngine=HexEngine;require('../stages/hexagon.js');
const recorded={
 1595:{fps:20,frames:3533,gameStartOffset:.10,gameRate:1.0333,sourceStart:0,sourceEnd:176.60},
 1596:{fps:20,frames:2207,gameStartOffset:.05,gameRate:1.0383,sourceStart:3.55,sourceEnd:113.85}
};
for(const id of ['1595','1596']){
 test('decode independent source-video wall order '+id,async()=>{
  const text=fs.readFileSync('data/hexagon-'+id+'.b64','utf8');
  const playback=await HexReplay.decode(text,{...recorded[id],id});
  assert.equal(playback.frames.length,recorded[id].frames);
  assert.equal(playback.fps,20);
  const duration=playback.gameStartOffset+(playback.frames.length-1)/20*playback.gameRate;
  assert.ok(duration>110);
  const g=new HexEngine.ArenaGame(0);
  g.attachReplay(playback,{spectating:true});
  assert.equal(g.sides,6);assert.equal(g.dead,false);
  const checkpoints=[.1,10,20,30,59.95,60.05,90,Math.min(duration-.1,120)];
  for(const t of checkpoints){
   assert.equal(g.seekReplay(t),true);
   assert.ok(g.replayFrame>=0&&g.replayFrame<playback.frames.length);
   assert.ok(Number.isFinite(g.rotation)&&Number.isFinite(g.zoom));
   if(t>=1)assert.ok(g.walls.length>0,'no visible observed contour near time '+t);
   for(const wall of g.walls){
    assert.ok(wall.points.length>=3);
    assert.ok(wall.points.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)));
   }
  }
  g.seekReplay(59.95);const i=g.replayFrame,oldCount=g.walls.length;
  g.update(.1);
  assert.ok(g.time>60,'cross the video game-time 60-second boundary');
  assert.ok(g.replayFrame>i,'timeline increments, not restarted at 60');
  assert.ok(g.walls.length>0&&oldCount>0,'no destructive 60s clear');
  g.seekReplay(duration-.2);g.update(.5);
  assert.equal(g.timelineEnded,true);
  const frozen=g.time;g.update(1);
  assert.equal(g.time,frozen,'source end stops the clock');
 });
}
test('original menu still has exactly six modes, no seventh playback route',()=>{
 assert.equal(HexEngine.LEVELS.length,6);
 assert.equal(HexEngine.getMap(6),null);
 assert.equal(Object.keys(HexEngine.getMap(0).replays).join(','),'1595,1596');
 for(let i=1;i<6;i++)assert.equal(HexEngine.hasMap(i),false);
});
