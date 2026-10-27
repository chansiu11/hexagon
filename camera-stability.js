// Limit abrupt scale jumps in video-fitted camera frames without changing
// their rotation, shear, position or any gameplay/wall geometry.
(function(root){'use strict';
const MAX_CAMERA_SCALE_RATE=2.7; // world-scale units per second
function cameraScale(m){
 if(!Array.isArray(m)||m.length<6)return NaN;
 const determinant=m[0]*m[3]-m[1]*m[2];
 return Number.isFinite(determinant)&&determinant>0?Math.sqrt(determinant):NaN;
}
function stabilizeCameraScale(previous,target,dt){
 const nextScale=cameraScale(target),oldScale=cameraScale(previous);
 if(!Number.isFinite(nextScale)||!Number.isFinite(oldScale)||!Number.isFinite(dt)||dt<=0)
  return target;
 const maxStep=MAX_CAMERA_SCALE_RATE*dt;
 const stableScale=oldScale+Math.max(-maxStep,Math.min(maxStep,nextScale-oldScale));
 const k=stableScale/nextScale;
 // Only the linear 2x2 transform is limited. Translation and camera angle
 // remain exactly those supplied by the measured reference timeline.
 return [target[0]*k,target[1]*k,target[2]*k,target[3]*k,target[4],target[5]];
}
const API={cameraScale,stabilizeCameraScale,MAX_CAMERA_SCALE_RATE};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexCameraStability=API;
})(typeof window!=='undefined'?window:globalThis);
