/* HEXAGONER 0-60 reference-only camera/palette.
 * Source: user-supplied 1557(7).mp4, approx 01:58.1-02:56.
 * Camera direction reconstructed from central six-fold ring at 15 fps.
 * Angle values are in hundredths of a radian, every 0.5 game seconds:
 * reference-video 3-fold background phase / 3, median filtered (13 frames),
 * with early transition frames extrapolated. Angle and hue are approximate;
 * per-frame camera perspective and exact wall source are not proven.
 * Crucially, NO random numbers or wall part state affect this motion.
 */
(function(root){'use strict';
const KEY_CENTIRAD=[
-36,-19,-3,14,30,46,69,81,96,119,132,146,172,188,202,225,237,252,271,286,308,319,
250,238,214,201,187,99,48,21,-11,-58,-87,-124,-167,-190,-218,-269,-295,-331,-378,
-395,-428,-476,-500,-481,-447,-427,-388,-343,-320,-293,-244,-215,-163,-135,-145,-169,
-218,-247,-279,-327,-352,-387,-428,-452,-484,-531,-560,-593,-638,-667,-680,-665,-640,
-609,-560,-534,-508,-470,-455,-469,-515,-546,-580,-626,-650,-679,-726,-755,-787,-836,
-868,-880,-831,-801,-771,-724,-695,-665,-620,-593,-589,-635,-664,-696,-744,-771,-808,
-851,-874,-902,-952,-981,-1015,-1062,-1072,-1108,-1157,-1179,-1162
];
const HUE_KEYS=[
// Extracted approximate video progression, from orange to yellow, green and
// chartreuse; no randomized palette changes.
[0,28],[7,35],[13,46],[18,58],[23,85],[28,119],[34,142],[40,150],
[47,146],[53,125],[57.5,85],[60,28]
];
const FIRST_VIDEO_SECOND=118.12,VIDEO_CLOCK_RATE=25/24;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function angleAt(t){
 const f=clamp(t*2,0,KEY_CENTIRAD.length-1),i=Math.floor(f),u=f-i;
 return (KEY_CENTIRAD[i]*(1-u)+KEY_CENTIRAD[Math.min(i+1,KEY_CENTIRAD.length-1)]*u)/100;
}
function palette(t){
 t=clamp(t,0,60);
 let hue=HUE_KEYS[0][1];
 for(let i=1;i<HUE_KEYS.length;i++){
  if(t>HUE_KEYS[i][0]){hue=HUE_KEYS[i][1];continue;}
  const [a,ha]=HUE_KEYS[i-1],[b,hb]=HUE_KEYS[i];
  hue=ha+(hb-ha)*(t-a)/(b-a);break;
 }
 return [hue,92,[6,17,66]];
}
function cameraAt(t){
 t=clamp(t,0,60);
 // Source clock is strictly game-time driven; quantization retains the
 // source's non-eased, abrupt spin reversals instead of smoothing across them.
 const angle=angleAt(Math.floor(t*60+1e-8)/60);
 const beat=t*140/60,phase=((beat%1)+1)%1,pulse=Math.exp(-phase*13);
 const scale=.79+.028*pulse,cy=.96,cos=Math.cos(angle),sin=Math.sin(angle);
 const tick=Math.floor(t*30+1e-8);
 const jx=Math.round((((tick%4)+4)%4-1.5)*1.4*pulse*2)/2;
 const jy=Math.round(((tick%3)-1)*1.4*pulse*2)/2;
 return [scale*cos,scale*sin*cy,-scale*sin,scale*cos*cy,jx,jy];
}
const API={KEY_CENTIRAD,HUE_KEYS,FIRST_VIDEO_SECOND,VIDEO_CLOCK_RATE,
 angleAt,palette,cameraAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHexagonerReference=API;
})(typeof window!=='undefined'?window:globalThis);
