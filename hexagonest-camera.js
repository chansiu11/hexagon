/* Camera tracks digitized from 1556.mp4, 768x480 at 30 fps.
 * Samples encode only geometric measurements: no video or music is stored.
 * Zoom from central hexagon contours and camera turns, sampled at 2.5Hz.
 */
(function(root){'use strict';
const HZ=2.5,OFFSET=.60,STILL_AT=116.2;
const BEAT=typeof module!=='undefined'?require('./hexagonest-beat-early'):root.HexHexagonestBeatEarly;
const MONO=typeof module!=='undefined'?require('./hexagonest-beat-mono'):root.HexHexagonestBeatMono;
const Z='mZiUf1pRc4eBdnFWVGpxa2lscXdzeWtzeHZmcnVocnh3dHFuaEVGYXFidmVjU1JAO22JeXFmPDdMZ195koyFf3hyh4SEinFdZYh/emluU1dOVnZua2p0cV9ZYmx6i49xW1FYVE5sWl5yeXd1Wml2fHx0eW18gH90amdnZ3Jpa1RgaHGHfGJea4qBemprb3pub2VUOVNzeXKLfGh3dGxvfG99eX51foVaW1lGTV1XU0dRSEhaV1RbTjVUXU1VTDtUYm5fWVhcTlNlUklCMjMzYVNYUltPPkpfRFJdbmBZY09ZVmZlUFBaYlFaWmxwamNQX2lTOEdRT1FFTFxjXmFtamNia2VzaGdsb1lST2BgWFdQUGduZ2hlbn96cWlSUGNhbXFwbm5ubm5bTFc/WkVJVT5aREtSNjI3T1ZAVkRBVDlWRFZMOFZDSVhFW0ZWUzxVRUJSOlpGR1BGUj5LWT9aREtHPEJHS0o5V0hJPTlWQklYPFdWS1w2PEdZWz9XREA+QlIwMD85VkNUVjs5MEpMPVpGRlE1NTtGUz5RUUpcQlZGRVU6XU1MUz1XQE1TOFhLRk88WkhHU0NBLkhNOD4rM0g9RSk6Wz1VRklVRVVDRVQ/WEA8OCVHREs+JTwtMEo/W0VLVDc3O1JRT0kvPy01NztbT09MPU1DTVBBNCk1NjpZQFlQNT0tNUY4RDAzPEBILD9OOFM6R0s5WT5JTDxaTEZHO1NBT1I/VEBASzBVQlNSQltCSU0+W0RPQD9FPEA9QltCTEg8VjtPWEJVQDU+NiopNTo/VEBPUDlXQVpQQF1KSUUpPy01Oj5UQE5JNEJkXk48U0FHUztXPE9MPkMuRE4vKjxPU0FUQlNMLD08SU8+VENKUDtWQDY1Kz40SDQ/VT1LU0JdRVg+Tks+OThFNSs+KkVPRFxCVVBIV0FQRSo8JjY0QltAUUs9VT1PRT9YPlRPQEJHU0lAVj84RUVSQVFOSVo7T0VAVzxUQik9NFVNPVY2MUNDW0NLS0ZcQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ow==';
const R='5gB1AAsAmv8s/7v+Sv7d/Wv9+fyJ/Bb8sftD+2774Ptw/Bb91/1//iX/y/90ABsBxAFtAhADwwI5AqIB+ABYALL/C/9l/r79Fv1j/L77avsT/L38Xv0I/rD+Uf8BAKYATwH2AZ0CSQPtA5gEOwU5BcQEHQR3A8sCIwJ8AdYALwCJ/93+Nf6e/Vr9AP6U/jf/4/+KADAB1QF7AiADzwN2BCAFxQVvBkoGnwX9BE8EqgMIA2ECugEUAWsAxf8a/3f+xf0f/XP9Gf6//mb/DACzAFkB/wGmAkwDzANoBGIEuwMVA28CyAEiAXsA1f8v/4j+4v07/ZX86Pyk/Ur+9v6Z/z0A6gCPATkC3wKLAygEKgSEA94CNwKRAeoARACe//f+Uf6q/eD8Ovx0+4v6s/nM+O33Efcv9lb1dvSS87byz/Gr8ofzY/RA9Rz2+PbU97D4jPlp+iH7/Pvb/Fb9ePya+8H62fkA+SD4Ovdd9n71ofTO8zz0GPX09dD2rPeJ+GX5Vfl0+JL3uPbU9fz0GPQ081jyffGj8MTv4e5a7jfvF/D08NbxvvKZ83v0WfU59hb3/Pfa+Lf5KPlM+GT3ivat9c308PML8yryUPHV8LPxlPJz80z0L/UG9vD23fev+Iz5avpH+zD8pfzJ+/P6EPox+VD4dveJ9vf20/ev+GD5Pfoe+/772vy4/Zf+ef8L/y/+U/13/Mn75voL+in5SPhm94j2rfXO9PDzC/Mn8k3x3PG78pnzf/Rj9T32Fff799v4tfmA+lz7';
function decode(s){
 const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',out=[];
 let buffer=0,bits=0;
 for(const ch of s){if(ch==='=')break;const v=abc.indexOf(ch);if(v<0)continue;
  buffer=(buffer<<6)|v;bits+=6;if(bits>=8){bits-=8;out.push(buffer>>bits&255);}}
 return out;
}
const z=decode(Z),r=decode(R);
function interpolation(t,count,fn){
 const position=Math.max(0,Math.min(count-1,t*HZ));
 const i=Math.floor(position),next=Math.min(i+1,count-1),p=position-i;
 return fn(i)*(1-p)+fn(next)*p;
}
// The 2.5 Hz angular samples resolve position but a linear cross-fade
// over each .4s interval spreads abrupt direction changes over many frames.
// Locate true reversal boundaries from the surrounding measured velocities:
// before / after velocities are held constant and switch on one instant.
// Endpoints remain EXACTLY the original extracted positions.
function rotationSample(i){
 const index=Math.max(0,Math.min(r.length/2-1,i));
 let signed=r[index*2]|r[index*2+1]<<8;
 if(signed>=32768)signed-=65536;
 return signed/128;
}
function rotationAt(videoTime){
 const position=Math.max(0,Math.min(r.length/2-1,videoTime*HZ));
 const i=Math.floor(position),f=position-i;
 if(i>=r.length/2-1)return rotationSample(i);
 const a=rotationSample(i),b=rotationSample(i+1);
 const middle=(b-a)*HZ;
 const before=i>0?(a-rotationSample(i-1))*HZ:middle;
 const after=i+2<r.length/2?(rotationSample(i+2)-b)*HZ:middle;
 if(before*after<0&&Math.abs(before)>.8&&Math.abs(after)>.8&&
    Math.abs(middle)<.92*Math.max(Math.abs(before),Math.abs(after))){
  const cut=(middle-after)/(before-after);
  if(cut>.05&&cut<.95){
   // Constant angular speed on both sides, no eased braking or acceleration.
   return f<cut?a+before*f/HZ:a+(before*cut+after*(f-cut))/HZ;
  }
 }
 return a+(b-a)*f;
}
function at(videoTime){
 const t=Math.max(0,videoTime);
 // Exact phase and amplitude from video-frame center-ring measurements.
 // Keep source launch frames and the later mono source behavior separate.
 const zoom=t>=STILL_AT?MONO.zoom(t):
  t>=.6?BEAT.zoom(t):interpolation(t,z.length,i=>.7+z[i]*.003);
 const rotation=t<STILL_AT?rotationAt(t):0;
 return {rotation,zoom,tilt:0};
}
const API={at,HZ,OFFSET,STILL_AT,VIDEO_WIDTH:768,VIDEO_HEIGHT:480,
 CAMERA_VERSION:'source-reversal-snap-v3',ZOOM_SAMPLES:z.length,ROTATION_SAMPLES:r.length/2,rotationAt};
if(typeof module!=='undefined')module.exports=API;else root.HexHexagonestCamera=API;
})(typeof window!=='undefined'?window:globalThis);
