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
const API={MORPH_SECONDS,RESUME_SECONDS,clockAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexMixedTransition=API;
})(typeof window!=='undefined'?window:globalThis);
