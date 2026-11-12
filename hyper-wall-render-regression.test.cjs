'use strict';
// Regression: user screenshot at HYPER HEXAGON 12.45s showed large blue
// wedges when 4-sided incoming walls were joined in a 5-sided arena.
// Keep render paths EXACTLY equal to the individual collision quads.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/play.js','utf8');
const anchor=source.indexOf('function drawWallField(');
const begin=source.indexOf('if(game.hyperHexagonSource78||game.hyperHexagonerSource910){',anchor);
const end=source.indexOf('if(game.hexagonerSource8){',begin);
assert(begin>anchor&&end>begin,'HYPER rendering branch must remain isolated');
const paint=new Function('ctx','walls','color','game',source.slice(begin,end));
const TAU=Math.PI*2;
function quad(sector,sourceSides,sceneSides,r,width){
 const mapped=Math.floor((sector+.5)*sceneSides/sourceSides);
 const a=mapped*TAU/sceneSides,b=(mapped+1)*TAU/sceneSides;
 return [[r*Math.cos(a),r*Math.sin(a)],[r*Math.cos(b),r*Math.sin(b)],
  [(r+width)*Math.cos(b),(r+width)*Math.sin(b)],
  [(r+width)*Math.cos(a),(r+width)*Math.sin(a)]];
}
function canvas(){
 return {paths:[],closed:0,fills:0,fillStyle:null,
  beginPath(){this.paths=[]},
  moveTo(x,y){this.paths.push([[x,y]])},
  lineTo(x,y){this.paths.at(-1).push([x,y])},
  closePath(){this.closed++},
  fill(){this.fills++}};
}
const cases=[
 // The photographed 12.45s state: center pentagon; next square wall
 // masks 1101, sectors 0, 2 and 3. Both visible and offscreen rings.
 [4,5,[0,2,3],631.600856,30],
 [4,5,[0,2,3],1355.569952,34],
 // Morph boundaries in the two HYPER stages.
 [6,5,[0,1,2,4,5],290,47],
 [5,4,[0,1,3,4],180,45],
 [5,6,[0,1,3,4],900,36],
 [6,6,[0,2,3,4,5],410,60]
];
for(const [src,scene,sectors,r,width] of cases)for(const stageFlag of
 ['hyperHexagonSource78','hyperHexagonerSource910']){
 const actors=sectors.map(sector=>({sector,sides:src,
  r,thickness:width,points:quad(sector,src,scene,r,width)}));
 const unchanged=JSON.stringify(actors),ctx=canvas();
 paint(ctx,actors,'#315cfa',{[stageFlag]:true});
 assert.equal(ctx.fillStyle,'#315cfa');
 assert.equal(ctx.fills,1,'batch a single fill to prevent internal seams');
 assert.equal(ctx.closed,actors.length,'every actor must have its own closed subpath');
 assert.deepEqual(ctx.paths,actors.map(w=>w.points),
  'never invent long contour edges across an open lane');
 assert.equal(JSON.stringify(actors),unchanged,'painting must not mutate collision quads');
}
const empty=canvas();paint(empty,[],'#fff',{hyperHexagonSource78:true});
assert.equal(empty.fills,0);
assert.equal(empty.paths.length,0);
console.log('PASS HYPER 7-10 wall rendering: 12 stage/shape cases, no synthetic lane joins');
