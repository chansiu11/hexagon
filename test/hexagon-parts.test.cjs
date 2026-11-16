'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const HexEngine=require('../engine.js');global.HexEngine=HexEngine;
const HexReplay=require('../replay.js');const HexParts=require('../parts.js');
require('../stages/hexagon.js');
let sources;
async function get(){
 if(!sources){
  const level=HexEngine.getMap(0),payload=await Promise.all(['1595','1596'].map(async id=>{
    const text=fs.readFileSync('data/hexagon-'+id+'.b64','utf8');
    return [id,await HexReplay.decode(text,{id,...level.replays[id]})];
  }));
  sources=Object.fromEntries(payload);
 }
 return sources;
}
test('two independent filmed wall banks have 53 verified, continuous avoidance phrases',async()=>{
 const bank=HexParts.makeBank(await get());
 assert.equal(bank.bank.length,53);
 assert.equal(bank.pre.length,24);assert.equal(bank.post.length,29);
 for(const id of ['1595','1596']){
  const r=bank.recordings[id],p=bank.bank.filter(x=>x.source===id);
  assert.equal(p[0].from,0);
  assert.equal(p.at(-1).to,r.frames.length-1);
  for(let k=0;k<p.length;k++){
   assert.ok(p[k].to>p[k].from);
   if(k)assert.equal(p[k].from,p[k-1].to,'no missing source frames');
   assert.equal(p[k].sideIn,r.frames[p[k].from].sides);
   assert.equal(p[k].sideOut,r.frames[p[k].to].sides);
   assert.ok(p[k].duration>2.5&&p[k].duration<10);
  }
 }
});
test('measured wall contours retain stable identifiers across consecutive recorded frames',async()=>{
 for(const [id,replay] of Object.entries(await get())){
  assert.ok(replay.trackStats.matched>5000,'tracked original actors '+id);
  assert.ok(replay.trackStats.matchRatio>.75,'clip identity continuity '+id);
  for(const frame of replay.frames){
   const ids=frame.walls.map(w=>w.id);
   assert.equal(new Set(ids).size,ids.length,'duplicate actor within source frame');
  }
 }
});
test('every phrase transition preserves the core side-count, avoids an impossible incoming seam and plays indefinitely',async()=>{
 const sources=await get(),tested=new Set();
 for(const seed of [1,2,42,97,65537]){
  const session=HexParts.create(sources,{seed});
  let angle=Math.PI/6;
  let last=0;
  let longestGap=0,gap=0;
  for(let ti=0;ti<180*20;ti++){
   const t=ti/20;
   const data=session.sample(t,angle);
   angle=((angle+data.playerAngleDelta)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
   assert.ok(Number.isFinite(data.angle)&&data.zoom>.5);
   assert.ok([4,5,6].includes(data.sides));
   gap=data.walls.length?0:gap+.05;
   longestGap=Math.max(longestGap,gap);
   if(session.transitions!==last){
    last=session.transitions;
    const change=session.history.at(-1);
    tested.add(change.part);
    const prev=session.history.at(-2),part=session.current;
    assert.ok(prev);
    const previousPart=session.bank.find(p=>p.id===prev.part);
    assert.equal(previousPart.sideOut,part.sideIn,'prevent wrong-sided morph at a random seam');
    const sample=sources[part.source];
    for(let k=0;k<6;k++){
     const frame=sample.frames[Math.min(part.from+k,part.to)];
     for(const wall of frame.walls){
      const x=Math.cos(angle)*66,y=Math.sin(angle)*66;
      const blocked=HexParts.pointInside(x,y,wall.points)&&
       !wall.holes.some(h=>HexParts.pointInside(x,y,h));
      assert.equal(blocked,false,'incoming part spawned over player: '+part.id);
     }
    }
   }
  }
  assert.ok(last>=27,'did not create enough separate phrases');
  assert.ok(session.history.some(s=>s.epoch===1),'post-60 parts never selected');
  assert.ok(longestGap<1,'long empty gameplay gap after linking '+seed);
  assert.equal(session.current.sideOut>=4,true);
 }
 assert.ok(tested.size>=15,'should exercise a diverse group of filmed phrases');
});
test('same seed has reproducible random order; different seeds vary',async()=>{
 const reels=await get();
 function sequence(seed){
  const g=HexParts.create(reels,{seed});let angle=Math.PI/6;
  for(let t=0;t<84;t+=.1){const f=g.sample(t,angle);angle=(angle+f.playerAngleDelta+Math.PI*20)%(Math.PI*2);}
  return g.history.map(item=>item.part);
 }
 assert.deepEqual(sequence(27182),sequence(27182));
 assert.notDeepEqual(sequence(27182),sequence(31415));
});
test('playback keeps 60-second wall field continuous without an epoch reset, and mode changes preserve elapsed time',async()=>{
 const g=new HexEngine.ArenaGame(0);
 g.attachReplay(HexParts.create(await get(),{seed:20261116}),{spectating:true});
 assert.equal(g.sides,6);
 g.update(59.96);
 const before=g.replay.activePart,at=g.time;
 assert.ok(g.walls.length>0);
 g.update(.09);
 assert.ok(g.time>60&&g.time>at);
 assert.equal(g.replay.activePart,before,'the exact 60s boundary cannot replace a moving wall');
 assert.ok(g.walls.length>0);
 assert.equal(g.timelineEnded,false);
 const time=g.time;
 g.setControlMode(2);g.stepSector(1);assert.equal(g.time,time);
 g.setControlMode(3);g.selectSector(0);assert.equal(g.time,time);
 g.pause();g.update(1);assert.equal(g.time,time);
 g.resume();g.update(20);
 assert.ok(g.time>80);
 assert.equal(g.replay.epoch,1);
 assert.ok(g.replay.history.length>=10);
 assert.ok(g.walls.every(w=>Array.isArray(w.points)&&w.points.length>=3));
});
test('render/collision polygons treat transparent seam fragments as nonlethal',()=>{
 const game=new HexEngine.ArenaGame(0,{shapes:[{at:0,sides:6}],walls:[]});
 const points=HexEngine.panelPolygon(45,60,6,0);
 game.walls=[{id:'fading',points,holes:[],opacity:.25}];
 assert.equal(game.checkCollision(),false);
 game.walls[0].opacity=.8;
 assert.equal(game.checkCollision(),true);
 assert.equal(game.death.wallId,'fading');
});