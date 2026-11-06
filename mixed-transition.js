/* Stage-seven wall clock: hold through the entire shape morph, then ease
   back to normal speed. No catch-up burst and no wall-position jump. */
(function(root){'use strict';
const MORPH_SECONDS=.65,RESUME_SECONDS=.18;
function clockAt(time,schedule){
 let lag=0;
 for(let i=1;i<schedule.length;i++){
  const boundary=schedule[i][0],elapsed=time-boundary;
  if(elapsed<=0)break;
  if(elapsed<=MORPH_SECONDS)return boundary-lag;
  if(elapsed<MORPH_SECONDS+RESUME_SECONDS){
   const u=(elapsed-MORPH_SECONDS)/RESUME_SECONDS;
   return boundary-lag+RESUME_SECONDS*(u*u*u-.5*u*u*u*u);
  }
  lag+=MORPH_SECONDS+RESUME_SECONDS/2;
 }
 return time-lag;
}
function timeAtClock(clock,schedule){
 if(clock<=0)return clock;
 let lo=0,hi=Math.max(60,clock+schedule.length);
 for(let i=0;i<52;i++){const mid=(lo+hi)/2;if(clockAt(mid,schedule)<clock)lo=mid;else hi=mid;}
 return hi;
}
// Six persistent corner tracks: reducing the polygon collapses complete
// edges into a shared corner, rather than cutting lanes at fractional edges.
// Every wall uses these same tracks regardless of its eventual impact shape.
const KNOTS=Object.freeze(Array.from({length:7},(_,i)=>i/6));
function cornerIndex(n,i){return Math.round(i*n/6);}
function laneAt(n,t){const k=t*6,j=Math.min(5,Math.floor(k)),f=k-j;return cornerIndex(n,j)*(1-f)+cornerIndex(n,j+1)*f;}
function unitAt(n,t){
 const k=t*6,j=Math.min(5,Math.floor(k)),f=k-j;
 const a=cornerIndex(n,j)*Math.PI*2/n,b=cornerIndex(n,j+1)*Math.PI*2/n;
 return [Math.cos(a)*(1-f)+Math.cos(b)*f,Math.sin(a)*(1-f)+Math.sin(b)*f];
}
function panels(sides,sector){
 // Pick whole canonical edges at birth. At the wall's native shape these
 // cover exactly one complete side; all subdivisions are permanent actors.
 const start=KNOTS.findIndex((_,i)=>cornerIndex(sides,i)===sector);
 const end=KNOTS.findIndex((_,i)=>cornerIndex(sides,i)===sector+1);
 return Array.from({length:end-start},(_,i)=>[KNOTS[start+i],KNOTS[start+i+1]]);
}
function pointAt(from,to,progress,t){
 const u=progress*progress*(3-2*progress),a=unitAt(from,t),b=unitAt(to,t);
 return [a[0]*(1-u)+b[0]*u,a[1]*(1-u)+b[1]*u];
}
function sectorT(sides,sector){
 const target=sector+.5;
 for(let i=0;i<6;i++){const a=cornerIndex(sides,i),b=cornerIndex(sides,i+1);if(b>a&&target>=a&&target<=b)return (i+(target-a)/(b-a))/6;}
 return 0;
}
function angleAt(from,to,progress,t){const p=pointAt(from,to,progress,t);return Math.atan2(p[1],p[0]);}
function trackAtAngle(from,to,progress,angle){
 const dx=Math.cos(angle),dy=Math.sin(angle);
 for(let i=0;i<6;i++){
  const a=pointAt(from,to,progress,i/6),b=pointAt(from,to,progress,(i+1)/6),vx=b[0]-a[0],vy=b[1]-a[1],den=vx*dy-vy*dx;
  if(Math.abs(den)<1e-12)continue;
  const u=-(a[0]*dy-a[1]*dx)/den;
  if(u>=-1e-9&&u<=1+1e-9&&(a[0]+u*vx)*dx+(a[1]+u*vy)*dy>0)return (i+Math.max(0,Math.min(1,u)))/6;
 }
 return ((angle/(Math.PI*2))%1+1)%1;
}
const API={MORPH_SECONDS,RESUME_SECONDS,clockAt,timeAtClock,unitAt,panels,KNOTS,laneAt,pointAt,sectorT,angleAt,trackAtAngle};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexMixedTransition=API;
})(typeof window!=='undefined'?window:globalThis);
