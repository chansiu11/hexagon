(function(root){
'use strict';
const TAU=Math.PI*2,STEP=TAU/6;
// The original game uses a 60 Hz update and angular arrow speeds of 7 or
// 9 degrees/tick (Hexagonest and Hyper Hexagonest use 9). Based on
// https://github.com/sumguytho/SuperHexagonRE#arrow_speed
// Convert to radians/second so browser movement stays frame independent.
const ORIGINAL_TICK_RATE=60;
const ORIGINAL_ARROW_DEGREES_PER_TICK=Object.freeze([7,7,9,7,7,9]);
// Preserve the original game's documented stage differences as reference,
// but intentionally use the first stage's orbit rate on every map.
const PLAYER_SPEED=ORIGINAL_ARROW_DEGREES_PER_TICK[0]*TAU/360*ORIGINAL_TICK_RATE;
const PLAYER_SPEED_BY_LEVEL=Object.freeze(ORIGINAL_ARROW_DEGREES_PER_TICK.map(()=>PLAYER_SPEED));const profiles=typeof module!=='undefined'?require('./stage-profiles.js'):(root.StageProfiles||[]);
const levels=[['HEXAGON','HARD',32,220],['HEXAGONER','HARDER',120,250],['HEXAGONEST','HARDEST',285,290],['HEXAGON','HARDESTER',190,300],['HEXAGONER','HARDESTEST',225,335],['HEXAGONEST','HARDESTESTEST',0,370]];
const wrap=a=>(a%TAU+TAU)%TAU;
function intersect(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],axis=[p[i][1]-q[1],q[0]-p[i][0]];const aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false}return true}
function wallPoly(r,sector,thickness=30,sides=6){
 // A wave can travel past the center before its recorded lifetime expires.
 // Negative radii used to fold sectors across the origin, causing twisted
 // wall polygons and collision ghosts. Clip the radial interval to zero.
 const inner=Math.max(0,r),outer=Math.max(inner,r+thickness),step=TAU/sides,a=sector*step,b=a+step;
 return [[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(b)*inner,Math.sin(b)*inner],[Math.cos(b)*outer,Math.sin(b)*outer],[Math.cos(a)*outer,Math.sin(a)*outer]];
}
function playerPoly(angle,lean=0){const a=angle+lean,c=Math.cos(a),s=Math.sin(a),x=Math.cos(angle)*66,y=Math.sin(angle)*66;return [[7,0],[-3.5,-6.0621778265],[-3.5,6.0621778265]].map(([u,v])=>[x+u*c-v*s,y+u*s+v*c])}

// Recorded connected walls may be concave. SAT is only valid for the old convex sectors.
function polygonOverlap(a,b,holes=[]){
 const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const x=poly[i],y=poly[j];if((x[1]>p[1])!==(y[1]>p[1])&&p[0]<(y[0]-x[0])*(p[1]-x[1])/(y[1]-x[1])+x[0])hit=!hit;}return hit;};
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const segment=(a,b,c,d)=>{if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))return false;return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;};
 if(a.some(v=>inside(v,b)&&!holes.some(h=>inside(v,h)))||inside(b[0],a))return true;
 for(const ring of [b,...holes])for(let i=0;i<a.length;i++)for(let j=0;j<ring.length;j++)if(segment(a[i],a[(i+1)%a.length],ring[j],ring[(j+1)%ring.length]))return true;
 return false;
}

/** All six stages use the stage-one rigid, constant-speed wall trajectory. */
function observedWaveRadius(w,time){
 return w.r-w.speed*(time-w.start);
}

class Game{
 constructor(level=0,timeline=null){this.level=level;this.profile=profiles[level];this.timeline=timeline&&typeof timeline==='object'?timeline:null;this.timelineEnded=false;this.time=0;this.angle=-Math.PI/2;this.rotation=0;this.rotationSpeed=.9;this.playerLean=0;this.sides=6;this.fromSides=6;this.morph=1;this.pendingSides=6;this.shapeWait=false;this.zoom=1;this.tilt=0;this.walls=[];this.next=0.08;this.dead=false;this.lastGap=4;this.pattern=0;this.rings=0;this.completed=false}
 get playerSpeed(){return PLAYER_SPEED_BY_LEVEL[this.level]??PLAYER_SPEED}
 get bpm(){return [130,140,150,150,160,170][this.level]}
 get speed(){return levels[this.level][3]+Math.min(this.time/60,1)*18+(this.completed&&this.level<3?65:0)}
 get targetSides(){if(this.profile&&this.time<60){const schedule=this.profile.shapeSchedule;for(let i=schedule.length-1;i>=0;i--)if(this.time>=schedule[i][0])return schedule[i][1]}const phase=Math.floor((this.time%60)/10);return [[6,6,5,6,4,6],[6,5,6,4,6,5],[6,6,4,6,5,6]][this.level%3][phase]}
 sampleWalls(){
 const data=this.timeline;if(!data)return;
 if(data.mode==='rigid-observed-tracks'||data.mode==='batched-wall-waves'){
  const position=Math.max(0,Math.min(data.camera.length-1,this.time*data.sampleRate)),index=Math.floor(position),u=position-index;
  const a=data.camera[index],b=data.camera[Math.min(index+1,data.camera.length-1)];
  this.wallFrame=index;this.recordedCamera=a.map((v,k)=>v+(b[k]-v)*u);
  if(data.mode==='batched-wall-waves'){
   this.waves=data.waves.filter(w=>this.time>=w.start&&this.time<w.end).map(w=>({...w,r:observedWaveRadius(w,this.time)}));
   this.walls=this.waves.flatMap(w=>w.sectors.map(sector=>({id:w.id+':'+sector,waveId:w.id,sector,sides:w.sides,r:w.r,thickness:w.thickness})));
  }else this.walls=data.walls.filter(w=>this.time>=w.start&&this.time<w.end).map(w=>({...w,r:w.r-w.speed*(this.time-w.start)}));
  return;
 }
 const index=Math.min(data.frames.length-1,Math.floor((this.time+1e-9)*data.sampleRate));
 if(index===this.wallFrame)return;
 this.wallFrame=index;const frame=data.frames[index];this.recordedCamera=frame.camera;
 this.walls=frame.walls.map(([id,points,holes=[]])=>({id,points,holes}));
 }

 update(dt,input=0){if(this.dead||this.timelineEnded)return;const steps=Math.max(1,Math.ceil(dt/(1/240))),h=dt/steps;for(let n=0;n<steps;n++){this.time+=h;if(this.timeline&&this.time>=this.timeline.duration){this.time=this.timeline.duration;this.completed=true;this.timelineEnded=true;break;}this.playerLean+=(input*.6-this.playerLean)*(1-Math.exp(-h/(input?.055:.085)));this.completed=this.time>=60;this.angle=wrap(this.angle+input*this.playerSpeed*h);const beat=this.time*this.bpm/60;const direction=Math.floor(beat/16)%2?-1:1;const target=direction*(.9+this.level*.19)*(1+.15*Math.sin(beat*Math.PI/16));this.rotationSpeed+=(target-this.rotationSpeed)*Math.min(1,h*7);this.rotation+=this.rotationSpeed*h;this.pendingSides=this.targetSides;
this.shapeWait=this.pendingSides!==this.sides;
if(this.shapeWait&&(this.profile&&this.time<60||this.walls.length===0)){this.fromSides=this.sides;this.sides=this.pendingSides;this.morph=0;this.lastGap=Math.floor(wrap(this.angle)/TAU*this.sides);this.shapeWait=false}
this.morph=Math.min(1,this.morph+h/0.45);
const phase=beat%1,accent=Math.exp(-phase*10);const targetZoom=1+accent*.075+.045*Math.sin(beat*Math.PI/8);this.zoom+=(targetZoom-this.zoom)*Math.min(1,h*32);
const tiltTarget=Math.min(1,Math.max(0,this.time-1))*.24*Math.sin(beat*Math.PI/16)*Math.sin(Math.min(this.time/4,1)*Math.PI/2);this.tilt+=(tiltTarget-this.tilt)*Math.min(1,h*3);
if(this.timeline)this.sampleWalls();else for(const w of this.walls)w.r-=this.speed*h;
const p=playerPoly(this.angle,this.playerLean);
if(this.walls.some(w=>w.points?polygonOverlap(p,w.points,w.holes):intersect(p,wallPoly(w.r,w.sector,w.thickness||30,w.sides||6)))){this.dead=true;break}
if(!this.timeline)this.walls=this.walls.filter(w=>w.r+(w.thickness||30)>50)}}
}
const API={polygonOverlap,Game,PLAYER_SPEED,PLAYER_SPEED_BY_LEVEL,ORIGINAL_TICK_RATE,ORIGINAL_ARROW_DEGREES_PER_TICK,levels,wallPoly,playerPoly,intersect,wrap,observedWaveRadius};if(typeof module!=='undefined')module.exports=API;else root.HexEngine=API;
})(typeof window!=='undefined'?window:globalThis);

