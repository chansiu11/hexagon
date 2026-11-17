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
test('a source clock running at 25/24 keeps game-time 60s at source frame 3456',()=>{
 const source=fixture('1595');
 source.gameRate=25/24;
 source.frames[3455].walls=[{id:'crosses-60',points:[[55,-7],[90,-7],[90,7],[55,7]]}];
 source.frames[3456].walls=source.frames[3455].walls;
 source.frames[3457].walls=source.frames[3455].walls;
 const film=Film.parse(source,'1595',{allowFixture:true});
 const metrics=Film.stats(film);
 assert.equal(metrics.boundaryFrame,3456);
 assert.equal(metrics.carriedAcross60,1);
 assert.ok(Math.abs(metrics.gameEnd-(source.frames.length-1)/60*25/24)<1e-8);
 const game=new Engine.ArenaGame(4);
 game.attachReplay(film,{spectating:true});
 assert.equal(game.seekReplay(60),true);
 assert.equal(game.replayFrame,3456);
 assert.equal(game.walls[0].id,film.frames[3455].walls[0].id);
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

test('stage-5 source audit reports missing verification, gaps and the carried 60s actor',()=>{
 const audit=require('../tools/audit-hyper-hexagoner-source.cjs').audit;
 const report=audit(fixture('1595'),'1595');
 assert.equal(report.pre60Frames,3600);
 assert.equal(report.post60Frames,121);
 assert.equal(report.uniqueWallIds,1);
 assert.equal(report.carriedAcross60,1);
 assert.equal(report.independentlyVerified,false);
 assert.ok(report.longestDetectedBirthGapSeconds>1);
 assert.ok(report.warnings.some(s=>s.includes('not')||s.includes('Not')));
});

test('post-60 flag is based on calibrated game clock even with fewer than 3600 frames',()=>{
 const data=fixture('1596');
 data.gameRate=25/24;
 data.frames=data.frames.slice(0,3500);
 const film=Film.parse(data,'1596',{allowFixture:true});
 assert.equal(film.sourceHasFull60,true);
 assert.equal(Film.stats(film).before60Frames,3456);
 assert.equal(Film.stats(film).after60Frames,44);
});

test('SCREEN-space filmed polygon edges are unrotated once and line up with the renderer sector rays',()=>{
 const theta=0.347,zoom=1.38;
 const source=fixture('1595');
 const original=Engine.panelPolygon(100,34,6,1);
 const screen=original.map(([x,y])=>[
  zoom*(x*Math.cos(theta)-y*Math.sin(theta)),
  zoom*(x*Math.sin(theta)+y*Math.cos(theta))
 ]);
 source.coordinateSpace='screen';
 source.frames[0]={angle:theta,zoom,sides:6,
  walls:[{id:'on-sector-rays',points:screen,holes:[]}]};
 const film=Film.parse(source,'1595',{allowFixture:true});
 assert.equal(film.coordinateSpace,'screen');
 const model=new Engine.ArenaGame(4);
 model.attachReplay(film,{spectating:true});
 assert.equal(model.walls.length,1);
 for(let i=0;i<4;i++){
  const world=model.walls[0].points[i],expected=original[i];
  assert.ok(Math.hypot(world[0]-expected[0],world[1]-expected[1])<1e-8,
   'camera rotation was applied twice or sector edge drifted');
  // Rendering with the CURRENT camera must recover the exact original
  // screenshot coordinates while polygon vertices stay on world rays.
  const projected=[
   zoom*(world[0]*Math.cos(theta)-world[1]*Math.sin(theta)),
   zoom*(world[0]*Math.sin(theta)+world[1]*Math.cos(theta))
  ];
  assert.ok(Math.hypot(projected[0]-screen[i][0],projected[1]-screen[i][1])<1e-8);
 }
 for(const p of model.walls[0].points){
  const rad=Math.atan2(p[1],p[0]),step=Math.PI/3;
  const remainder=Math.atan2(Math.sin(rad/step*Math.PI*2),Math.cos(rad/step*Math.PI*2));
  assert.ok(Math.abs(remainder)<1e-7,'sector edge not on a radial line');
 }
 model.spectating=false;
 model.angle=1.5*Math.PI/3;
 assert.equal(model.checkCollision(),false,'wall at radius 100 should not hit orbit 66');
});
test('world-space fixture remains unchanged and bad coordinate tags are rejected',()=>{
 const raw=fixture('1596');
 const original=raw.frames[3599].walls[0].points;
 assert.deepEqual(Film.parse(raw,'1596',{allowFixture:true}).frames[3599].walls[0].points,
  original);
 raw.coordinateSpace='pixels-of-another-stage';
 assert.throws(()=>Film.parse(raw,'1596',{allowFixture:true}),/coordinate space/);
});
