'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../engine.js'),Replay=require('../replay.js');
const Parts=require('../hyper-hexagon-parts.js');
globalThis.HexEngine=Engine;require('../stages/hyper-hexagon.js');
const root=path.join(__dirname,'..');
let cache=null;
async function setup(){
 if(cache)return cache;
 const meta=JSON.parse(fs.readFileSync(path.join(root,'data/hyper-hexagon-4-2-bank.json'),'utf8'));
 const defs=Engine.getMap(3).replays,films={};
 for(const id of ['1595','1596']){
  const raw=fs.readFileSync(path.join(root,defs[id].path),'utf8');
  films[id]=await Replay.decode(raw,{...defs[id],id});
  films[id].palette={fps:20,colors:Array.from({length:1000},()=>[0,0,20,0,0,45,42,151,238])};
 }
 return cache={meta,films};
}
test('the two verified 60fps references split into distinct original 0–60 and 60+ dodges',async()=>{
 const {meta,films}=await setup(),bank=Parts.makeBank(films,meta);
 assert.equal(bank.all.length,48);
 assert.equal(bank.pre.length,30);
 assert.equal(bank.post.length,18);
 assert.equal(bank.byId['1595-00'].from,0);
 assert.equal(bank.byId['1596-00'].from,0);
 for(const id of ['1595','1596']){
  assert.equal(films[id].fps,60);
  const list=bank.all.filter(p=>p.source===id);
  assert.equal(list[0].from,0);
  assert.equal(list.at(-1).to,films[id].frames.length-1);
  assert.ok(list.some(p=>p.epoch===0)&&list.some(p=>p.epoch===1));
  for(let i=1;i<list.length;i++)assert.equal(list[i-1].to,list[i].from,
    id+' source lost a wall frame at a part cut');
  assert.ok(meta.sources[id].cuts.includes(meta.boundaryFrame));
  const before=new Set(films[id].frames[meta.boundaryFrame-1].walls.map(w=>w.id));
  assert.ok(films[id].frames[meta.boundaryFrame].walls.some(w=>before.has(w.id)),
   id+' would recreate still-visible 60-second wall');
 }
});
test('reachable seam search rejects an actual blocked source lane',()=>{
 const blank=Array.from({length:9},()=>new Uint8Array(48));
 const full=Array.from({length:9},()=>new Uint8Array(48).fill(1));
 assert.equal(Parts.isSafe(blank,full,0,8.5,0,0),false);
 assert.equal(Parts.isSafe(blank,blank,0,8.5,0,0),true);
});
test('both films occur in live randomized pre/post-60 timeline; sampled walls are not wiped at seams',async()=>{
 const {meta,films}=await setup();
 for(const seed of [1,8,23,59]){
  const session=Parts.create(films,meta,{seed,firstSource:seed%2?'1595':'1596',playerSpeed:Engine.PLAYER_SPEED});
  const all=new Set(),pre=new Set(),post=new Set();
  let prev=0,maxEmpty=0,empty=0,hadCarry=false;
  for(let t=0;t<=165;t+=.10){
   // Tests enumerate the entire source bank without artificially overriding
   // a wall hit or claiming a human can survive this spectator path.
   const frame=session.sample(t,.35);
   if(session.ended)break;
   assert.equal(session.epoch,t<60?0:1);
   assert.ok(frame.walls.every(w=>Array.isArray(w.points)&&w.points.length>=3));
   if(frame.walls.length)empty=0;else empty+=t-prev;
   maxEmpty=Math.max(empty,maxEmpty);prev=t;
   all.add(session.source);(t<60?pre:post).add(session.source);
   if(session.carry.length)hadCarry=true;
  }
  assert.ok(session.transitions>=12,'not enough filmed dodge phrase transitions for seed '+seed);
  assert.equal(session.ended,false,'source phrase algorithm unexpectedly ended at seed '+seed);
  assert.ok(all.size>=2,'only one original video selected at seed '+seed);
  assert.ok(pre.size>=2&&post.size>=2,'both source videos required before and after 60s: '+seed);
  assert.ok(maxEmpty<=1.01,'all walls disappeared for more than 1s at seed '+seed+' ('+maxEmpty+')');
  assert.ok(session.history.every((e,i)=>i===0||e.at>=session.history[i-1].at));
  const after60=session.history.find(h=>h.epoch===1);
  assert.ok(after60 && after60.at>=60 && after60.at<=60.00001,
   'source must switch to the post-60 bank at exactly 60 seconds');
  assert.ok(session.history.some(h=>h.epoch===0&&h.at<60));
  assert.ok(hadCarry,'non-contiguous joins did not preserve previous in-flight walls');
  assert.ok(session.history.every(h=>h.score===undefined||Number.isFinite(h.score)||h.fallback),
   'a blocked fallback was incorrectly marked as verified');
 }
});
test('HYPER stage uses filmed polygons for both passable gaps and genuine collision',async()=>{
 const {meta,films}=await setup();
 const replay=Parts.create(films,meta,{seed:100,firstSource:'1595',playerSpeed:Engine.PLAYER_SPEED});
 const game=new Engine.ArenaGame(3);game.attachReplay(replay,{spectating:true});
 game.update(1.0,0);assert.equal(game.dead,false);
 const TAU=Math.PI*2;
 let found=null;
 for(let t=3;t<11&&!found;t+=.1){
  game.update(.1,0);if(game.walls.length===0)continue;
  let safe=null,hit=null;
  for(let k=0;k<240;k++){
   const a=(k+.5)*TAU/240,x=Engine.ORBIT*Math.cos(a),y=Engine.ORBIT*Math.sin(a);
   const wall=game.walls.find(w=>Engine.pointInsidePolygon(x,y,w.points)&&
    !(w.holes||[]).some(h=>Engine.pointInsidePolygon(x,y,h)));
   if(wall&&!hit)hit=a;
   if(!wall&&safe===null)safe=a;
  }
  if(hit!==null&&safe!==null)found={hit,safe};
 }
 assert.ok(found,'actual visible walls never occupied player orbit');
 game.spectating=false;game.angle=found.safe;
 assert.equal(game.checkCollision(),false);
 game.angle=found.hit;assert.equal(game.checkCollision(),true);
 assert.ok(game.death?.wallId);
 const restart=game.reset();restart.attachReplay(Parts.create(films,meta,{seed:100,firstSource:'1595'}));
 assert.equal(restart.time,0);assert.equal(restart.dead,false);
});