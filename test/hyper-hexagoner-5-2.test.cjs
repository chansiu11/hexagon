'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Engine=require('../engine.js');
const Film=require('../hyper-hexagoner-film.js');
const Parts=require('../hyper-hexagoner-parts.js');
globalThis.HexEngine=Engine;
require('../stages/hexagon.js');
require('../stages/hexagoner.js');
require('../stages/hyper-hexagon.js');
require('../stages/hyper-hexagoner.js');
const FPS=60,TAU=Math.PI*2;
function source(id){
 const frames=Array.from({length:FPS*68+1},(_,i)=>{
  const wave=Math.floor(i/56),f=i%56;
  const walls=[];
  if(f<43){
   const rad=270-3.55*f;
   // A moving source-observed wall track. Always leaves other lanes open.
   const x=rad+(id==='1596'?7:0);
   const y=id==='1596'?16:-16;
   walls.push({id:'wave-'+wave,
    points:[[x,y-11],[x+21,y-11],[x+21,y+11],[x,y+11]],holes:[]});
  }
  // A source actor overlaps the 60-second epoch boundary.
  if(i>=3597&&i<=3612)walls.push({id:'boundary-actor',
   points:[[58,-10],[88,-10],[88,10],[58,10]],holes:[]});
  return {angle:.03*Math.sin(i/80),zoom:1,sides:6,walls};
 });
 const raw={schemaVersion:1,stageIndex:4,id,sourceFile:id==='1595'?
  '1595(4).mp4':'1596(4).mp4',fps:FPS,frames,videoStart:0,
  videoEnd:68,gameRate:1,gameStartOffset:0,independentlyVerified:true};
 return Film.parse(raw,id);
}
let recordings;
function films(){return recordings||=Object.freeze({'1595':source('1595'),'1596':source('1596')});}

test('5-2 has neither invented wall patterns nor stage 7, and cannot use unverified source',()=>{
 const map=Engine.getMap(4);
 assert.deepEqual(Object.keys(map.replays),['1595','1596']);
 assert.equal(map.walls.length,0);
 assert.equal(Engine.hasMap(6),false);
 assert.equal(Engine.getMap(0).name,'HEXAGON');
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/hyper-hexagoner-parts\.js/);
 assert.match(html,/stages\/hyper-hexagoner\.js/);
 assert.doesNotMatch(html,/stage-profiles\.js/);
 assert.throws(()=>Parts.create({}),/Both original/);
 const one=films().1595;
 assert.throws(()=>Parts.create({1595:one}),/Both original/);
 assert.throws(()=>Parts.create({1595:{...one,independentlyVerified:false},
  1596:films().1596}),/Unverified/);
});

test('derive separate 0-60 and 60+ phrases from each of the two video sources',()=>{
 const bank=Parts.buildBank(films());
 for(const id of ['1595','1596']){
  const count=bank.counts[id];
  assert.equal(count.boundaryFrame,3600);
  assert.ok(count.pre>1,'pre-60 split');
  assert.ok(count.post>=1,'post-60 split');
  const pre=bank.pre.filter(p=>p.source===id),post=bank.post.filter(p=>p.source===id);
  assert.equal(pre[0].from,0);
  assert.equal(pre.at(-1).to,3600);
  assert.equal(post[0].from,3600);
  assert.equal(post.at(-1).to,60*68);
  for(const epochParts of [pre,post]){
   for(let i=1;i<epochParts.length;i++)
    assert.equal(epochParts[i].from,epochParts[i-1].to,'no dropped source frames at cut');
  }
 }
});

test('a nonadjacent entry does not instantly spawn actors already present at cut',()=>{
 const bank=Parts.buildBank(films());
 const phrase=bank.pre.find(p=>p.from>0&&p.births.size>0&&p.preexisting.size>0);
 assert.ok(phrase,'fixture must contain live actors at a cut');
 const session=Parts.create(films(),{seed:34,firstSource:'1595'});
 session.current=phrase;session.source=phrase.source;session.start=0;
 session.contiguous=false;session.runId=2;
 const first=session.sample(0,Math.PI);
 assert.equal(first.walls.length,0,'preexisting source wall appeared instantly');
 const after=session.sample(.9,Math.PI);
 assert.ok(after.walls.some(w=>w.id.startsWith('2:')),'new incoming source actor did not arrive');
});

test('source-based random playback crosses 60s, remains alive under spectator and uses both film IDs',()=>{
 for(const firstSource of ['1595','1596']){
  const session=Parts.create(films(),{seed:17,firstSource,playerSpeed:8.3});
  const game=new Engine.ArenaGame(4);
  game.attachReplay(session,{spectating:true});
  game.angle=Math.PI;
  for(let i=1;i<=530;i++){
   game.update(.24);
   if(game.timelineEnded)break;
  }
  assert.ok(game.time>=65,'source run ended before 60s: '+game.time);
  assert.ok(session.history.some(h=>h.epoch===1),'no post60 phrase selected');
  assert.equal(session.epoch,1);
  assert.ok(session.transitions>4);
  assert.ok(session.history.every(h=>['1595','1596'].includes(h.source)));
  const origins=new Set(session.history.map(h=>h.source));
  assert.ok(origins.has(firstSource));
  assert.ok(origins.size===2,'both original film segments should be selected');
  assert.equal(session.unsafeSeams,0,'unsafe seam should not be committed');
 }
});

test('renderer and collision engine share polygon coordinates, death reset and core safety',()=>{
 const film=films().1595,game=new Engine.ArenaGame(4);
 game.attachReplay(film,{spectating:true});
 assert.equal(game.dead,false);
 assert.equal(game.seekReplay(60),true);
 assert.ok(game.walls.some(w=>w.id.includes('boundary-actor')));
 game.spectating=false;
 game.angle=Math.PI;
 assert.equal(game.checkCollision(),false);
 game.angle=0;
 assert.equal(game.checkCollision(),true);
 assert.equal(game.dead,true);
 const rest=game.reset();
 rest.attachReplay(film,{spectating:true});
 assert.equal(rest.time,0);
 assert.equal(rest.dead,false);
});
