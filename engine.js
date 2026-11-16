/* Rebuilt from scratch in task 1-1; no legacy pattern or stage imports. */
(function(root){
'use strict';
const TAU=Math.PI*2,PLAYER_RADIUS=66,CORE_RADIUS=46,ORBIT_SPEED=7*TAU/6;
const levels=Object.freeze([
 ['HEXAGON','HARD',32,220],['HEXAGONER','HARDER',120,250],
 ['HEXAGONEST','HARDEST',285,290],['HEXAGON','HARDESTER',190,300],
 ['HEXAGONER','HARDESTEST',225,335],['HEXAGONEST','HARDESTESTEST',0,370]
].map(v=>Object.freeze(v)));
const providers=new Map();
const wrap=a=>((a%TAU)+TAU)%TAU;
const validNumber=(x,min=0)=>Number.isFinite(x)&&x>=min;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function polyForWall(w){
 const n=w.sides||6,a=w.sector*TAU/n,b=(w.sector+1)*TAU/n;
 const inner=Math.max(0,w.inner),outer=Math.max(inner,inner+w.thickness);
 return [[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(b)*inner,Math.sin(b)*inner],
 [Math.cos(b)*outer,Math.sin(b)*outer],[Math.cos(a)*outer,Math.sin(a)*outer]];
}
function insidePoly(x,y,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>y)!==(b[1]>y)){
   const cut=(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0];
   if(x<cut)inside=!inside;
  }
 }
 return inside;
}
function validateWall(w){
 if(!w||!validNumber(w.at)||!validNumber(w.radius,1)||!validNumber(w.speed,1)||
 !validNumber(w.thickness,1)||!Number.isInteger(w.sector))throw new TypeError('Invalid wall actor');
 const sides=w.sides??6;
 if(!Number.isInteger(sides)||sides<3||sides>12||w.sector<0||w.sector>=sides)throw new TypeError('Invalid wall lane');
 return Object.freeze({at:w.at,radius:w.radius,speed:w.speed,thickness:w.thickness,sector:w.sector,sides});
}
function validateTimeline(data){
 const walls=(data?.walls||[]).map(validateWall).sort((a,b)=>a.at-b.at);
 const shapeEvents=(data?.shapeEvents||[]).map(e=>{
  if(!validNumber(e.at)||!Number.isInteger(e.sides)||e.sides<3||e.sides>12)throw new TypeError('Invalid shape event');
  return Object.freeze({at:e.at,sides:e.sides});
 }).sort((a,b)=>a.at-b.at);
 return Object.freeze({walls:Object.freeze(walls),shapeEvents:Object.freeze(shapeEvents),
  provenance:data?.provenance||'not-video-verified'});
}
function registerPattern(level,source){
 if(!Number.isInteger(level)||level<0||level>=levels.length)throw new RangeError('Unknown map');
 if(typeof source!=='function')throw new TypeError('Pattern provider must be a function');
 providers.set(level,source);
}
function hasPattern(level){return providers.has(level)}
function getPattern(level){return hasPattern(level)?validateTimeline(providers.get(level)()):null}
const KEY_POOL='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function randomKeys(random=Math.random){
 const pool=[...KEY_POOL];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 return pool.slice(0,6);
}
class Game{
 constructor(level=0,override=null){
  if(!Number.isInteger(level)||level<0||level>=levels.length)throw new RangeError('Map removed or unknown');
  if(level!==0&&!override&&!hasPattern(level))throw new Error('Map '+(level+1)+' has no rebuilt wall pattern');
  this.level=level;
  this.timeline=validateTimeline(override||getPattern(level)||{walls:[],shapeEvents:[]});
  this.time=0;this.dead=false;this.deathTime=null;this.angle=wrap(-Math.PI/2);this.sides=6;
  this.controlMode=1;this.doubleStepReady=false;this.directKeys=randomKeys();
  this.rotation=0;this.zoom=1;this.tilt=0;
  this.walls=[];this.nextWall=0;this.nextShape=0;
 }
 setControlMode(mode){if(![1,2,3].includes(mode))throw new RangeError('Invalid mode');this.controlMode=mode;this.doubleStepReady=false}
 armDoubleStep(){if(this.dead||this.controlMode!==2)return false;this.doubleStepReady=true;return true}
 stepSector(direction){
  if(this.dead||this.controlMode!==2||!direction)return false;
  this.angle=wrap(this.angle+Math.sign(direction)*(this.doubleStepReady?2:1)*TAU/this.sides);
  this.doubleStepReady=false;this.checkCollision();return true;
 }
 selectSector(sector){
  if(this.dead||this.controlMode!==3||!Number.isInteger(sector)||sector<0||sector>=this.sides)return false;
  this.angle=wrap((sector+.5)*TAU/this.sides);this.checkCollision();return true;
 }
 sectorForKey(code){
  const label=/^Key[A-Z]$/.test(code)?code.slice(3):/^(Digit|Numpad)[0-9]$/.test(code)?code.slice(-1):null;
  const i=this.directKeys.indexOf(label);return i>=0&&i<this.sides?i:-1;
 }
 spawnDue(){
  while(this.nextWall<this.timeline.walls.length&&this.timeline.walls[this.nextWall].at<=this.time+1e-8){
   const w=this.timeline.walls[this.nextWall++];
   this.walls.push({...w,inner:w.radius-w.speed*(this.time-w.at)});
  }
  while(this.nextShape<this.timeline.shapeEvents.length&&this.timeline.shapeEvents[this.nextShape].at<=this.time+1e-8){
   this.sides=this.timeline.shapeEvents[this.nextShape++].sides;
  }
 }
 checkCollision(){
  if(this.dead)return false;
  const x=PLAYER_RADIUS*Math.cos(this.angle),y=PLAYER_RADIUS*Math.sin(this.angle);
  // Polygon used for collision is exactly the polygon passed to the painter.
  for(const w of this.walls)if(insidePoly(x,y,polyForWall(w))){
   this.dead=true;this.deathTime=this.time;return true;
  }
  return false;
 }
 update(dt,turn=0){
  if(this.dead||!Number.isFinite(dt)||dt<=0)return;
  let remaining=Math.min(dt,.25);
  while(remaining>1e-9&&!this.dead){
   const step=Math.min(remaining,1/240);remaining-=step;this.time+=step;
   if(this.controlMode===1)this.angle=wrap(this.angle+clamp(turn,-1,1)*ORBIT_SPEED*step);
   this.spawnDue();
   for(const w of this.walls)w.inner=w.radius-w.speed*(this.time-w.at);
   this.checkCollision();
   if(!this.dead)this.walls=this.walls.filter(w=>w.inner+w.thickness>=CORE_RADIUS-18);
  }
 }
 snapshot(){return {time:this.time,dead:this.dead,angle:this.angle,walls:this.walls.map(w=>({...w,polygon:polyForWall(w)}))}}
}
const API={Game,levels,registerPattern,hasPattern,validateTimeline,polyForWall,insidePoly,wrap,
 PLAYER_RADIUS,CORE_RADIUS,ORBIT_SPEED};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexEngine=API;
})(typeof window!=='undefined'?window:globalThis);
