(function(root){
'use strict';
const TAU=Math.PI*2,STEP=TAU/6;
const levels=[['HEXAGON','HARD',32,135],['HEXAGONER','HARDER',120,165],['HEXAGONEST','HARDEST',285,195],['HEXAGON','HARDESTER',190,205],['HEXAGONER','HARDESTEST',225,235],['HEXAGONEST','HARDESTESTEST',0,265]];
const wrap=a=>(a%TAU+TAU)%TAU;
function intersect(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],axis=[p[i][1]-q[1],q[0]-p[i][0]];const aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false}return true}
function wallPoly(r,sector,thickness=24){const a=sector*STEP,b=a+STEP;return [[Math.cos(a)*r,Math.sin(a)*r],[Math.cos(b)*r,Math.sin(b)*r],[Math.cos(b)*(r+thickness),Math.sin(b)*(r+thickness)],[Math.cos(a)*(r+thickness),Math.sin(a)*(r+thickness)]]}
function playerPoly(angle){return [[73,0],[59,-5],[59,5]].map(([x,y])=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)])}
class Game{
 constructor(level=0,random=Math.random){this.level=level;this.random=random;this.time=0;this.angle=-Math.PI/2;this.rotation=0;this.walls=[];this.next=0.5;this.dead=false;this.lastGap=4;this.pattern=0;this.rings=0;this.completed=false}
 get speed(){return levels[this.level][3]+Math.min(this.time/60,1)*18+(this.completed&&this.level<3?65:0)}
 spawn(){const direction=this.random()<.5?-1:1;let gap;
 if(this.rings%6===0)this.pattern=Math.floor(this.random()*4);
 if(this.pattern===0)gap=(this.lastGap+1)%6;
 else if(this.pattern===1)gap=(this.lastGap+(this.rings%2?2:4))%6;
 else if(this.pattern===2)gap=(this.lastGap+direction+6)%6;
 else gap=this.lastGap;
 const wide=this.rings<2||this.pattern===3;const holes=[gap];if(wide)holes.push((gap+1)%6);
 const distance=Math.min((gap-this.lastGap+6)%6,(this.lastGap-gap+6)%6)*STEP;
 this.next=this.time+Math.max(.58,24/this.speed+distance/5.1+.27);
 for(let i=0;i<6;i++)if(!holes.includes(i))this.walls.push({r:520,sector:i});
 this.lastGap=gap;this.rings++;
 }
 update(dt,input=0){if(this.dead)return;const steps=Math.max(1,Math.ceil(dt/(1/240))),h=dt/steps;for(let n=0;n<steps;n++){this.time+=h;this.completed=this.time>=60;this.angle=wrap(this.angle+input*5.1*h);this.rotation+=h*(.38+this.level*.1)*(Math.floor(this.time/8)%2?-1:1);if(this.time>=this.next)this.spawn();for(const w of this.walls)w.r-=this.speed*h;const p=playerPoly(this.angle);if(this.walls.some(w=>w.r<90&&w.r+24>50&&intersect(p,wallPoly(w.r,w.sector)))){this.dead=true;break}this.walls=this.walls.filter(w=>w.r+24>32)}}
}
const API={Game,levels,wallPoly,playerPoly,intersect,wrap};if(typeof module!=='undefined')module.exports=API;else root.HexEngine=API;
})(typeof window!=='undefined'?window:globalThis);
