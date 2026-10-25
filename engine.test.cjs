const assert=require('node:assert/strict');const {Game,intersect,wallPoly,playerPoly}=require('./engine');
assert(intersect(playerPoly(.5),wallPoly(60,0)));assert(!intersect(playerPoly(.5),wallPoly(150,0)));
let g=new Game(0,()=>.5);g.walls=[{r:80,sector:0}];g.next=999;g.angle=.5;g.update(.15);assert(g.dead,'wall must kill');
g=new Game();g.next=999;g.update(.1,1);assert(!g.dead);assert(Math.abs(g.angle-((Math.PI*1.5)+.51))<.0001);
let a=new Game(0,()=>.5),b=new Game(0,()=>.5);a.next=b.next=999;for(let i=0;i<60;i++)a.update(1/60,1);for(let i=0;i<120;i++)b.update(1/120,1);assert(Math.abs(a.angle-b.angle)<1e-9);assert(Math.abs(a.time-b.time)<1e-9);
g=new Game();g.next=999;for(let i=0;i<3601;i++)g.update(1/60);assert(g.completed);assert(!g.dead);
for(let i=0;i<6;i++){g=new Game(i,()=>.5);for(let n=0;n<3000&&!g.dead;n++)g.update(1/120);assert(g.dead,'stationary player eventually hits a wall');assert(g.walls.every(w=>Number.isFinite(w.r)))}
console.log('PASS collision, movement, frame-rate independence, completion, all six levels');
for(const sides of [4,5,6]){
 const a=Math.PI/sides;
 assert(intersect(playerPoly(a),wallPoly(66/Math.cos(a)-15,0,30,sides)),`${sides}-sided wall collision`);
 assert(!intersect(playerPoly(a+Math.PI),wallPoly(66/Math.cos(a)-15,0,30,sides)),`${sides}-sided opposite gap`);
}
g=new Game();g.time=19.99;g.next=999;g.walls=[{r:1000,sector:0,sides:6}];g.update(.02);assert.equal(g.sides,6,'never change shape through existing walls');assert.equal(g.shapeWait,true);g.walls=[];g.update(.02);assert.equal(g.sides,5);assert(g.morph<1);g.time=40;g.update(.02);assert.equal(g.sides,4);g.time=50;g.update(.02);assert.equal(g.sides,6);
for(let l=0;l<6;l++){g=new Game(l,()=>.3);g.next=999;for(let n=0;n<7200;n++)g.update(1/120);assert(Number.isFinite(g.zoom)&&Number.isFinite(g.tilt));assert(g.zoom>.85&&g.zoom<1.2);assert(Math.abs(g.tilt)<.25)}
console.log('PASS 4/5/6-sided collisions, safe transitions, bounded camera transforms');

for(let level=0;level<6;level++)for(let angle=0;angle<72;angle++)for(const seed of [.1,.4,.7,.99]){const fixed=new Game(level,()=>seed);fixed.angle=angle*Math.PI*2/72;for(let n=0;n<1200&&!fixed.dead;n++)fixed.update(1/120);assert(fixed.dead,'stationary safe spot: level '+level+' angle '+angle+' seed '+seed)}
console.log('PASS 1728 stationary trajectories: no persistent safe spot within 10 seconds');
