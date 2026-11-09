/* HARD-only motion calibration. Reference measurements and uncertainty are
   recorded in hard-motion-reference.json / HARD-REFERENCE-ANALYSIS.md. */
(function(root){'use strict';
const CLOCK_RATE=25/24,BASE_COMPRESSION=.92;
function audioTime(gameTime){return gameTime/CLOCK_RATE}
function frameDelta(seconds,hard){return Math.max(0,Math.min(seconds,hard ? .25 : .05))}
function wallSpeed(time){return time<60?300:360}
function spinRate(time){return (time<10?60:time<60?120:180)*Math.PI/180}
function zoomAt(gameTime){const t=audioTime(gameTime),beat=t*130/60;return 1.03+.085*Math.exp(-(beat%1)*9)+.09*(1+Math.sin(t*.48))/2}
function viewState(time,events=[]){
 let kick=0;
 for(const e of events){
  if(e.at>time)break;const age=time-e.at;
  if(time<12||age<0||age>2.4||Math.abs(e.tilt||0)<.28)continue;
  const value=Math.sin(Math.PI*age/2.4)**2*Math.sign(e.tilt);
  if(Math.abs(value)>Math.abs(kick))kick=value;
 }
 // Preserve the measured base constant but exaggerate the side-on plane.
 // Perspective kicks bring the floor almost edge-on without flipping it.
 return {compression:Math.max(.30,BASE_COMPRESSION-.17+.008*Math.sin(time*.67)-.43*Math.abs(kick)),
  shear:.014*Math.sin(time*.83)+.30*kick};
}
function cameraAt(time,rotation,zoom=zoomAt(time),events=[]){
 const {compression,shear}=viewState(time,events),c=Math.cos(rotation),s=Math.sin(rotation);
 // Project the whole world together: baseline vertical foreshortening,
 // a small shear and rare stronger perspective kicks. Never flatten or flip.
 return [(c+shear*s)*zoom,compression*s*zoom,(-s+shear*c)*zoom,compression*c*zoom,0,0];
}
const API={CLOCK_RATE,BASE_COMPRESSION,audioTime,frameDelta,wallSpeed,spinRate,zoomAt,viewState,cameraAt};
if(typeof module!=='undefined')module.exports=API;else root.HexHardMotion=API;
})(typeof window!=='undefined'?window:globalThis);
