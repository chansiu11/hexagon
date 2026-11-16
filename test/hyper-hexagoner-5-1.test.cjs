'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Engine=require('../engine.js'),Film=require('../hyper-hexagoner-film.js');
globalThis.HexEngine=Engine;
require('../stages/hexagon.js');
require('../stages/hexagoner.js');
require('../stages/hyper-hexagon.js');
require('../stages/hyper-hexagoner.js');
function fixture(id){
 const count=60*62+1;
 const frames=Array.from({length:count},(_,i)=>({angle:0,zoom:1,sides:6,walls:[]}));
 const ring={id:'same-at-boundary',points:[[60,-8],[84,-8],[84,8],[60,8]],holes:[]};
 for(let i=3598;i<=3602;i++)frames[i].walls=[ring];
 return {schemaVersion:1,stageIndex:4,id,fps:60,videoStart:100,videoEnd:162.1,
   sourceFile:id==='1595'?'1595(4).mp4':'1596(4).mp4',frames};
}
test('stage 5 has its own source slots and does not overwrite 1–4 or restore stage 7',()=>{
 assert.equal(Engine.getMap(4).name,'HEXAGONER');
 assert.equal(Engine.hasMap(6),false);
 assert.deepEqual(Object.keys(Engine.getMap(4).replays),['1595','1596']);
 assert.ok(Engine.hasMap(0)&&Engine.hasMap(1)&&Engine.hasMap(3));
 assert.equal(Engine.getMap(4).walls.length,0,'do not invent old stage-5 geometry');
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(html.includes('stages/hyper-hexagoner.js'));
 assert.ok(!html.includes('stage-profiles.js'));
});
test('unverified or missing 60+ video chronology cannot masquerade as verified original',()=>{
 const invalid=fixture('1595');invalid.frames=invalid.frames.slice(0,60*30);
 assert.throws(()=>Film.parse(invalid,'1595'),/Incomplete/);
 assert.throws(()=>Film.parse(fixture('1595'),'1595'),/not been verified/);
 assert.throws(()=>Film.parse({...fixture('1595'),id:'1596'},'1595'),/Incomplete/);
});
test('first genuine filmed wall contour is not silently removed at game launch',()=>{
 const source=fixture('1595');
 source.frames[0].walls=[{id:'first-real-approach',
  points:[[100,-9],[125,-9],[125,9],[100,9]],holes:[]}];
 const film=Film.parse(source,'1595',{allowFixture:true});
 const game=new Engine.ArenaGame(4);
 game.attachReplay(film,{spectating:true});
 assert.equal(game.walls.length,1,'stage 5 discarded valid first wall');
 assert.equal(game.walls[0].sourceFrame,0);
 assert.equal(game.dead,false);
});
test('independently indexed 0–60 / 60+ frames retain source wall IDs and passable lanes',()=>{
 for(const id of ['1595','1596']){
  const film=Film.parse(fixture(id),id,{allowFixture:true}),metrics=Film.stats(film);
  assert.equal(metrics.before60Frames,3600);
  assert.equal(metrics.after60Frames,121);
  assert.equal(metrics.carriedAcross60,1);
  assert.equal(film.frames[3599].walls[0].id,film.frames[3600].walls[0].id);
  assert.equal(film.frames[3600].walls[0].id,film.frames[3601].walls[0].id);
  assert.ok(film.frames[3600].walls[0].id.includes(id));
  const game=new Engine.ArenaGame(4);
  game.attachReplay(film,{spectating:true});
  assert.equal(game.seekReplay(60),true);
  assert.equal(game.walls.length,1);
  game.spectating=false;
  game.angle=Math.PI;
  assert.equal(game.checkCollision(),false,'open lane falsely killed the ship');
  game.angle=0;
  assert.equal(game.checkCollision(),true,'contact did not kill the ship');
  assert.ok(game.death);
  const restart=game.reset();restart.attachReplay(film,{spectating:true});
  assert.equal(restart.time,0);
  assert.equal(restart.dead,false);
 }
});
