/* Death camera measured from VGkmTsx3HIw: flash ~104.0, normal radius
   through 104.95, linear rapid enlargement 104.95–105.12, results ~105.24.
   Never zoom the collision geometry or reverse the existing spin. */
(function(root){'use strict';
const Motion=typeof module!=='undefined'?require('./hard-motion'):root.HexHardMotion;
const ZOOM_START=.933333,ZOOM_END=1.10,RESULT_START=1.2;
function deathView(game,age){
 const t=Math.max(0,age);let scale=1;
 if(t>ZOOM_START&&t<ZOOM_END)scale=1+4.1*(t-ZOOM_START)/(ZOOM_END-ZOOM_START);
 else if(t>=ZOOM_END)scale=5.1-.2*Math.min(1,(t-ZOOM_END)/(RESULT_START-ZOOM_END));
 // Only HEXAGON (level 0) and HEXAGONEST (level 2) freeze the exact
 // impact camera; preserve the separate original post-impact enlargement.
 if(game.level===0||game.hexagonestMode)
  return {zoom:scale,scale,rotation:game.deathCamera?.rotation??game.rotation};
 const pulse=Motion.zoomAt;
 return {zoom:scale,scale:scale*pulse(game.time+t*Motion.CLOCK_RATE)/pulse(game.time),rotation:game.rotation+game.rotationSpeed*t};
}
const API={deathView,ZOOM_START,ZOOM_END,RESULT_START};if(typeof module!=='undefined')module.exports=API;else root.HexHardFeedback=API;
})(typeof window!=='undefined'?window:globalThis);
