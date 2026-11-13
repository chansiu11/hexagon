'use strict';
// Live HYPER HEXAGONER must draw, collide, and move with ONE geometry.
// In particular no segmented movie core/line may be rendered.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('./engine.js');
const H=require('./hyper-hexagoner-910.js');
const TAU=2*Math.PI;
const play=fs.readFileSync(__dirname+'/play.js','utf8');
const a=play.indexOf('function drawWallField(');
const start=play.indexOf('if(game.hyperHexagonSource78||game.hyperHexagonerSource910){',a);
const stop=play.indexOf('if(game.hexagonerSource8){',start);
assert(start>a&&stop>start,'single HYPER quad-render branch exists');
const render=play.slice(start,stop);
assert(!render.includes('atlasContour'),'film extraction must not draw on top of live geometry');
const draw=new Function('ctx','walls','color','game',render);
function canvas(){
 return {fillStyle:null,paths:[],fillCount:0,closed:0,
  beginPath(){this.paths=[];},
  moveTo(x,y){this.paths.push([[x,y]]);},
  lineTo(x,y){this.paths.at(-1).push([x,y]);},
  closePath(){this.closed++;},
  fill(){this.fillCount++;}};
}
function close(a,b,eps=1e-7){return Math.abs(a-b)<eps;}
let samples=0,quads=0;
for(const mode of ['video','random'])
 for(const seed of [1,2,5,17,2026]){
  const g=new H.HyperHexagonerGame(H.create(null,seed,92,{order:mode}));
  for(let tick=0;tick<87*4;tick++){
   const time=tick/4;g.time=time;g.sampleWalls();
   assert.equal(g.atlasActive,false);
   assert.strictEqual(g.walls,g._collisionWalls);
   const ctx=canvas();
   draw(ctx,g.walls,'#4188fa',{hyperHexagonerSource910:true});
   assert.equal(ctx.fillCount,g.walls.length?1:0,'a wall frame draws once');
   assert.equal(ctx.paths.length,g.walls.length,'draw every physics actor, no extra lines');
   assert.equal(ctx.closed,g.walls.length);
   for(let i=0;i<g.walls.length;i++){
    const wall=g.walls[i],p=wall.points;
    assert.equal(p.length,4,'quadrilateral, no irregular film fragments');
    assert.deepEqual(ctx.paths[i],p,'render matches physical hit polygon point for point');
    const expected=E.wallVisualPoly(wall);
    for(let j=0;j<4;j++)for(let k=0;k<2;k++)
     assert(close(p[j][k],expected[j][k]),'wall follows the exact sector line');
    const radius=Math.max(0,wall.r),a=wall.sector*TAU/6,b=(wall.sector+1)*TAU/6;
    assert(close(p[0][0],radius*Math.cos(a)));
    assert(close(p[0][1],radius*Math.sin(a)));
    assert(close(p[1][0],radius*Math.cos(b)));
    assert(close(p[1][1],radius*Math.sin(b)));
    quads++;
   }
   samples++;
  }
 }
const t=H.create(null,4,6,{order:'video'});
const danger=new H.HyperHexagonerGame(t);
danger.angle=(2+.5)*TAU/6;
for(let i=0;i<400&&!danger.dead;i++)danger.update(1/120,0);
assert(danger.dead,'advancing visible wall must actually kill on center contact');
assert(danger.death.wall.length===4,'saved impact uses the same wall quad');
assert(danger.death.time>1.9&&danger.death.time<2.9,'recorded first wall time');
console.log('PASS HYPER 9/10: '+samples+' play frames, '+quads+
 ' matching render/collision quads on polygon rays; death from visible inbound wall');
