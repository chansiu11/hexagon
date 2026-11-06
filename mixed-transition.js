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
// Common perimeter coordinates keep the core, every wall ring and backdrop
// on one deforming mesh. Include every possible corner so wall panels stay
// convex and neighbouring panels share the very same moving endpoint.
const KNOTS=Object.freeze([...new Set([4,5,6].flatMap(n=>Array.from({length:n+1},(_,i)=>i/n)))].sort((a,b)=>a-b));
function unitAt(n,t){
 const k=t*n,j=Math.floor(k),f=k-j,a=j*Math.PI*2/n,b=(j+1)*Math.PI*2/n;
 return [Math.cos(a)*(1-f)+Math.cos(b)*f,Math.sin(a)*(1-f)+Math.sin(b)*f];
}
function panels(sides,sector){
 const lo=sector/sides,hi=(sector+1)/sides,knots=KNOTS.filter(t=>t>=lo&&t<=hi);
 return knots.slice(0,-1).map((t,i)=>[t,knots[i+1]]);
}
const API={MORPH_SECONDS,RESUME_SECONDS,clockAt,unitAt,panels,KNOTS};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexMixedTransition=API;
})(typeof window!=='undefined'?window:globalThis);
