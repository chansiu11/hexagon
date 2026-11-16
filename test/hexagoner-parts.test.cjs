'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const HexEngine=require('../engine.js'),HexReplay=require('../replay.js'),Parts=require('../hexagoner-parts.js');
global.HexEngine=HexEngine;require('../stages/hexagon.js');require('../stages/hexagoner.js');
let sources;
async function load(){
 if(!sources){const map=HexEngine.getMap(1);
  sources=Object.fromEntries(await Promise.all(['1595','1596'].map(async id=>{
   const text=fs.readFileSync('data/hexagoner-'+id+'.b64','utf8');
   const record=await HexReplay.decode(text,{...map.replays[id],id});
   record.palette=JSON.parse(fs.readFileSync('data/hexagoner-'+id+'-palette.json','utf8'));
   return [id,record];
  })));
 }
 return sources;
}
const TAU=Math.PI*2;
test('two measured HEXAGONER film streams are partitioned into 37 continuous dodge phrases (23 before 60, 14 after)',async()=>{
 const data=Parts.makeBank(await load());
 assert.equal(data.all.length,37);assert.equal(data.pre.length,23);assert.equal(data.post.length,14);
 assert.equal(HexEngine.getMap(1).sourceStatus,'video-contour-37-dodge-phrases-task2-2');
 assert.ok(HexEngine.getMap(1).playerSpeed>HexEngine.getMap(0).playerSpeed);
 for(const id of ['1595','1596']){
  const parts=data.all.filter(p=>p.source===id),r=data.recordings[id];
  assert.equal(parts[0].from,0);assert.equal(parts.at(-1).to,r.frames.length-1);
  for(let k=0;k<parts.length;k++){
   const p=parts[k];assert.ok(p.duration>3.7&&p.duration<9);
   if(k)assert.equal(parts[k-1].to,p.from,'every frame belongs to a continuous source segment');
   assert.equal(p.first,r.frames[p.from]);assert.equal(p.last,r.frames[p.to]);
   assert.equal(p.sideIn,6);assert.equal(p.sideOut,6);
  }
 }
});
test('random source phrases remain deterministic under a seed, include both films, and do not erase moving walls at 60',async()=>{
 const src=await load();
 function run(seed,first){
  const session=Parts.create(src,{seed,firstSource:first});
  let angle=TAU/12;
  const ids60=[];let lastPart=null;
  for(let step=0;step<=1500;step++){
   const t=step/10,f=session.sample(t,angle);
   angle=(angle+f.playerAngleDelta+TAU)%TAU;
   if(step===599||step===600||step===601)ids60.push({time:t,part:session.activePart,epoch:session.epoch,ids:f.walls.map(w=>w.id)});
   assert.ok(f.zoom>=.5&&f.zoom<=1.6);
   assert.ok(Number.isFinite(f.angle));
   assert.equal(new Set(f.walls.map(w=>w.id)).size,f.walls.length,'no double-rendering same physical wall');
   assert.ok(f.walls.every(w=>w.points.length>=3&&w.points.every(p=>p.every(Number.isFinite))));
   assert.equal(session.ended,undefined,'no early film end or fabricated wall-free pause');
   lastPart=session.activePart;
  }
  assert.ok(session.transitions>=22,'source phrases must repeat after filmed end');
  assert.ok(session.history.some(p=>p.epoch===1),'post-60 bank used');
  assert.ok(session.history.some(p=>p.source!==first),'both film pools contribute');
  assert.ok(session.maxObservedGap<1,'no field-clearing >1-second hole');
  assert.ok(session.maxSpawnGap<1,'source-observed new incoming outer contours must recur within one second');
  assert.ok(session.outerArrivalEvents>300,'do not treat a static occupied field as new moving wall arrivals');
  assert.equal(ids60[0].epoch,0);assert.equal(ids60[1].epoch,1);
  assert.ok(ids60[0].ids.length>0&&ids60[2].ids.length>0);
  assert.ok(ids60[1].time===60&&ids60[2].time===60.1);
  return session.history.map(x=>x.part+':'+x.sectorShift);
 }
 const first=run(20261116,'1595');assert.deepEqual(first,run(20261116,'1595'));
 assert.notDeepEqual(first,run(42,'1596'));
});
test('outgoing wall objects are carried until their filmed exit; neighboring source frames do not duplicate them',async()=>{
 const src=await load(),session=Parts.create(src,{seed:7,firstSource:'1595'});
 const b=session.bank;
 // Natural, chronological adjacent phrase: keep actor IDs by reusing run ID.
 session.current=b.byId['1595-01'];session.source='1595';session.activePart=session.current.id;
 session.history=[{at:0,part:session.current.id,source:'1595',epoch:0}];
 session.choose=()=>({part:b.byId['1595-02'],score:0,sectorShift:0});
 const boundary=session.current.duration;
 const before=session.sample(boundary-.03,TAU/12);
 const a=new Set(before.walls.map(w=>w.id));
 const after=session.sample(boundary+.03,TAU/12);
 const persistence=after.walls.filter(w=>a.has(w.id)).length;
 assert.ok(persistence>0,'filmed neighboring contours keep stable physical identifiers');
 assert.equal(new Set(after.walls.map(w=>w.id)).size,after.walls.length);
 assert.equal(session.carry.length,0,'adjacent footage already continues those walls, no duplicate outgoing overlay');
 // Independent random source jump: old actors survive alongside new ones.
 const x=Parts.create(src,{seed:11,firstSource:'1595'});
 x.current=x.bank.byId['1595-01'];x.start=0;x.activePart=x.current.id;
 x.choose=()=>({part:x.bank.byId['1596-10'],score:0,sectorShift:0});
 const mid=x.current.duration;
 const first=x.sample(mid-.01,TAU/12),oldIDs=new Set(first.walls.map(w=>w.id));
 const next=x.sample(mid+.01,TAU/12);
 assert.ok(next.walls.some(w=>oldIDs.has(w.id)),'previous actors preserved during random source jump');
 assert.ok(next.walls.some(w=>!oldIDs.has(w.id)),'new film stream enters without clearing old actor field');
 assert.equal(new Set(next.walls.map(w=>w.id)).size,next.walls.length);
});
test('new HEXAGONER source session inherits player speed, collisions/death freeze/retry while preserving HEXAGON',async()=>{
 const films=await load(),g=new HexEngine.ArenaGame(1);
 const first=Parts.create(films,{seed:72,firstSource:'1596'});
 assert.equal(g.playerSpeed,8.2);
 g.attachReplay(first,{spectating:true});
 g.update(.42);assert.equal(g.dead,false);assert.equal(g.walls.length,0);
 g.update(60);assert.ok(g.time>60);assert.ok(g.walls.length>0);
 assert.equal(g.replay.epoch,1);assert.ok(g.replay.transitions>6);
 const old=g.time;g.pause();g.update(4);assert.equal(g.time,old);
 g.resume();g.update(.2);assert.ok(g.time>old);
 const poly=HexEngine.panelPolygon(50,55,6,g.currentSector());
 g.spectating=false;g.walls=[{id:'collision-check',points:poly,holes:[]}];
 assert.equal(g.checkCollision(),true,'visible wall blocks the ship orbit');
 assert.equal(g.death.wallId,'collision-check');
 const frozen=g.time;g.update(1);assert.equal(g.time,frozen);
 const reset=g.reset();assert.equal(reset.level,1);assert.equal(reset.time,0);assert.equal(reset.dead,false);
 const base=new HexEngine.ArenaGame(0);assert.equal(base.playerSpeed,HexEngine.PLAYER_SPEED);
});
test('both HEXAGONER source openings remain alive with real collision enabled (non-spectator)',async()=>{
 const films=await load();
 for(const source of ['1595','1596']){
  const g=new HexEngine.ArenaGame(1);
  g.attachReplay(Parts.create(films,{seed:20261116,firstSource:source}));
  const screenAngle=source==='1595'?-Math.PI/2:.26;
  g.angle=((screenAngle-g.rotation)%TAU+TAU)%TAU;
  g.update(1.5);
  assert.equal(g.dead,false,source+' caused an unintended opening death');
  assert.ok(g.walls.length>0,source+' missing its first arriving walls');
 }
});
