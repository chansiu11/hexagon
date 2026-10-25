const assert=require('node:assert/strict');const {Game,intersect,wallPoly,playerPoly}=require('./engine');
assert(intersect(playerPoly(.5),wallPoly(60,0)));assert(!intersect(playerPoly(.5),wallPoly(150,0)));
let g=new Game(0,()=>.5);g.walls=[{r:80,sector:0}];g.next=999;g.angle=.5;g.update(.15);assert(g.dead,'wall must kill');
g=new Game();g.next=999;g.update(.1,1);assert(!g.dead);assert(Math.abs(g.angle-((Math.PI*1.5)+.51))<.0001);
let a=new Game(0,()=>.5),b=new Game(0,()=>.5);a.next=b.next=999;for(let i=0;i<60;i++)a.update(1/60,1);for(let i=0;i<120;i++)b.update(1/120,1);assert(Math.abs(a.angle-b.angle)<1e-9);assert(Math.abs(a.time-b.time)<1e-9);
g=new Game();g.next=999;for(let i=0;i<3601;i++)g.update(1/60);assert(g.completed);assert(!g.dead);
for(let i=0;i<6;i++){g=new Game(i,()=>.5);for(let n=0;n<3000&&!g.dead;n++)g.update(1/120);assert(g.dead,'stationary player eventually hits a wall');assert(g.walls.every(w=>Number.isFinite(w.r)))}
console.log('PASS collision, movement, frame-rate independence, completion, all six levels');
