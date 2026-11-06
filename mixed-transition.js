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
const API={MORPH_SECONDS,RESUME_SECONDS,clockAt,unitAt,panels,KNOTS,laneAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexMixedTransition=API;
})(typeof window!=='undefined'?window:globalThis);
