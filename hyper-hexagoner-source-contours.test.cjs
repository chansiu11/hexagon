'use strict';
// Source-mode polygons are drawn from the SAME world-space coordinates
// used to detect avatar-center collision. Keep random mode unchanged.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('./engine.js');
const P=require('./stage-profiles.js');
const D=require('./hyper-hexagoner-910-data.js');
const F=require('./hyper-hexagoner-filmed-camera-15fps.js');
const TAU=Math.PI*2,WIDTH=576,HEIGHT=360;
let calls=0;
const sourceContour=[[-6,-5],[6,-5],[8,0],[6,5],[-6,5]];
const atlas={ready:true,WIDTH,HEIGHT,getFrame(videoSecond){
 calls++;
 const camera=F.cameraAt(videoSecond),x=66*Math.cos(Math.PI/6),y=66*Math.sin(Math.PI/6);
 const cx=288+(camera[0]*x+camera[2]*y)/(960/WIDTH);
 const cy=180+(camera[1]*x+camera[3]*y)/(600/HEIGHT);
 return {index:Math.round((videoSecond-403.466667)*60),
  rgb:[42,114,239],paths:[sourceContour.flatMap(([dx,dy])=>[cx+dx,cy+dy])]};
}};
const mod={exports:{}};
new Function('module','require',fs.readFileSync(__dirname+'/hyper-hexagoner-910.js','utf8'))(
 mod,p=>p==='./engine'?E:p==='./stage-profiles'?P:
 p==='./hyper-hexagoner-910-data'?D:
 p==='./hyper-hexagoner-wall-atlas'?atlas:F);
const H=mod.exports;
const game=new H.HyperHexagonerGame(H.create(null,7,88,{order:'video'}));
const play=fs.readFileSync(__dirname+'/play.js','utf8');
const anchor=play.indexOf('function drawWallField(');
const from=play.indexOf('if(game.hyperHexagonSource78||game.hyperHexagonerSource910){',anchor);
const to=play.indexOf('if(game.hexagonerSource8){',from);
assert(from>anchor&&to>from,'source rendering branch remains reachable');
const draw=new Function('ctx','walls','color','game',play.slice(from,to));
function ctxMock(){return {fillStyle:null,paths:[],fills:0,
 beginPath(){this.paths=[]},moveTo(x,y){this.paths.push([[x,y]])},
 lineTo(x,y){this.paths.at(-1).push([x,y])},closePath(){},fill(){this.fills++}}}
for(const t of [0,2.3,8.5,19,42,59.5,60.5,68,77.2,87.4]){
 game.time=t;game.angle=Math.PI/6;game.sampleWalls();
 assert(game.atlasActive,'video mode uses film wall geometry');
 assert.strictEqual(game.walls,game._filmWalls);
 assert.equal(game.filmFrame,Math.round((D.videoAtGameTime(t)-403.466667)*60));
 assert.equal(game.walls.length,1);
 assert.equal(game.walls[0].points.length,5,'do not reduce source polygon to a 4-corner quad');
 assert.equal(game.atlasColor,'rgb(42,114,239)');
 assert(game.hit(game.angle),'a visible film contour blocks the avatar-center point');
 assert.equal(game.hit(game.angle+Math.PI),null,'a visibly empty orbit lane remains open');
 const camera=game.recordedCamera;
 const frame=atlas.getFrame(D.videoAtGameTime(t)),src=frame.paths[0],pts=game.walls[0].points;
 for(let i=0;i<pts.length;i++){
  const [x,y]=pts[i],fx=(src[i*2]-WIDTH/2)*(960/WIDTH);
  const fy=(src[i*2+1]-HEIGHT/2)*(600/HEIGHT);
  assert(Math.abs(camera[0]*x+camera[2]*y+camera[4]-fx)<1e-5);
  assert(Math.abs(camera[1]*x+camera[3]*y+camera[5]-fy)<1e-5);
 }
 const ctx=ctxMock();draw(ctx,game.walls,'#ffffff',game);
 assert.equal(ctx.fillStyle,game.atlasColor);
 assert.equal(ctx.fills,1);
 assert.deepEqual(ctx.paths,[game.walls[0].points],
  'the draw path and collision path are point-for-point identical');
}
const before=calls;
const random=new H.HyperHexagonerGame(H.create(null,7,90,{order:'random'}));
random.time=8;random.sampleWalls();
assert.equal(random.atlasActive,false,'random whole-phrase mode still uses discrete source events');
assert.strictEqual(random.walls,random._collisionWalls);
assert.equal(calls,before,'random mode never samples film frames');
atlas.ready=false;game.sampleWalls();
assert.equal(game.atlasActive,false,'missing atlas returns to quad-based source events');
assert.strictEqual(game.walls,game._collisionWalls);
console.log('PASS film walls: 10 source moments, inverse camera, shared paint/hit, gap lane, random & fallback');
