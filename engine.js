(function(root){
'use strict';
const TAU=Math.PI*2,STEP=TAU/6;
const levels=[['HEXAGON','HARD',32,220],['HEXAGONER','HARDER',120,250],['HEXAGONEST','HARDEST',285,290],['HEXAGON','HARDESTER',190,300],['HEXAGONER','HARDESTEST',225,335],['HEXAGONEST','HARDESTESTEST',0,370]];
const wrap=a=>(a%TAU+TAU)%TAU;
function intersect(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],axis=[p[i][1]-q[1],q[0]-p[i][0]];const aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false}return true}
function wallPoly(r,sector,thickness=30,sides=6){const step=TAU/sides,a=sector*step,b=a+step;return [[Math.cos(a)*r,Math.sin(a)*r],[Math.cos(b)*r,Math.sin(b)*r],[Math.cos(b)*(r+thickness),Math.sin(b)*(r+thickness)],[Math.cos(a)*(r+thickness),Math.sin(a)*(r+thickness)]]}
function playerPoly(angle){return [[73,0],[62.5,-6.0621778265],[62.5,6.0621778265]].map(([x,y])=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)])}
class Game{
 constructor(level=0,random=Math.random){this.level=level;this.random=random;this.time=0;this.angle=-Math.PI/2;this.rotation=0;this.rotationSpeed=.9;this.sides=6;this.fromSides=6;this.morph=1;this.pendingSides=6;this.shapeWait=false;this.zoom=1;this.tilt=0;this.walls=[];this.next=0.08;this.dead=false;this.lastGap=4;this.pattern=0;this.rings=0;this.completed=false}
 get bpm(){return [130,140,150,150,160,170][this.level]}
 get speed(){return levels[this.level][3]+Math.min(this.time/60,1)*18+(this.completed&&this.level<3?65:0)}
 get targetSides(){const phase=Math.floor((this.time%60)/10);return [[6,6,5,6,4,6],[6,5,6,4,6,5],[6,6,4,6,5,6]][this.level%3][phase]}
 spawn(){const sides=this.sides,step=TAU/sides;const direction=this.random()<.5?-1:1;let gap;
 if(this.rings%6===0)this.pattern=Math.floor(this.random()*4);
 if(this.pattern===0)gap=(this.lastGap+1)%sides;
 else if(this.pattern===1)gap=(this.lastGap+(this.rings%2?1:sides-1))%sides;
 else if(this.pattern===2)gap=(this.lastGap+direction+sides)%sides;
 else gap=(this.lastGap+(this.rings%2?1:sides-1))%sides;
 const wide=this.rings<2;const holes=[gap];if(wide)holes.push((gap+1)%sides);
 const distance=Math.min((gap-this.lastGap+sides)%sides,(this.lastGap-gap+sides)%sides)*step;
 const minimum=Math.max(.58,30/this.speed+distance/5.1+.27);const halfBeat=30/this.bpm;this.next=this.time+Math.ceil(minimum/halfBeat)*halfBeat;
 for(let i=0;i<sides;i++)if(!holes.includes(i))this.walls.push({r:460,sector:i,sides});
 this.lastGap=gap;this.rings++;
 }
 update(dt,input=0){if(this.dead)return;const steps=Math.max(1,Math.ceil(dt/(1/240))),h=dt/steps;for(let n=0;n<steps;n++){this.time+=h;this.completed=this.time>=60;this.angle=wrap(this.angle+input*5.1*h);const beat=this.time*this.bpm/60;const direction=Math.floor(beat/16)%2?-1:1;const target=direction*(.9+this.level*.19)*(1+.15*Math.sin(beat*Math.PI/16));this.rotationSpeed+=(target-this.rotationSpeed)*Math.min(1,h*7);this.rotation+=this.rotationSpeed*h;this.pendingSides=this.targetSides;
this.shapeWait=this.pendingSides!==this.sides;
if(this.shapeWait&&this.walls.length===0){this.fromSides=this.sides;this.sides=this.pendingSides;this.morph=0;this.lastGap=Math.floor(wrap(this.angle)/TAU*this.sides);this.next=Math.max(this.next,this.time+.45);this.shapeWait=false}
this.morph=Math.min(1,this.morph+h/0.45);
const phase=beat%1,accent=Math.exp(-phase*10);const targetZoom=1+accent*.075+.045*Math.sin(beat*Math.PI/8);this.zoom+=(targetZoom-this.zoom)*Math.min(1,h*32);
const tiltTarget=.24*Math.sin(beat*Math.PI/16)*Math.sin(Math.min(this.time/4,1)*Math.PI/2);this.tilt+=(tiltTarget-this.tilt)*Math.min(1,h*3);
if(!this.shapeWait&&this.time>=this.next)this.spawn();for(const w of this.walls)w.r-=this.speed*h;const p=playerPoly(this.angle);if(this.walls.some(w=>w.r<90&&w.r+30>50&&intersect(p,wallPoly(w.r,w.sector,30,w.sides||6)))){this.dead=true;break}this.walls=this.walls.filter(w=>w.r+30>50)}}
}
const API={Game,levels,wallPoly,playerPoly,intersect,wrap};if(typeof module!=='undefined')module.exports=API;else root.HexEngine=API;
})(typeof window!=='undefined'?window:globalThis);

