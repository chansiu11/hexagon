/* HYPER HEXAGONER: original 2.5Hz sampled background RGB
 * from user-supplied footage 403.4667s to 488.1s. Each six bytes
 * stores the brighter/darker alternating background RGB.
 */
(function(root){'use strict';
const START=403.466667,FPS=2.5,COUNT=212,POST_START=461.4;
const PACKED='////2rDM////6uHx////1+f7////3OX4////79/x/////tvq////7eDx////2+X4/v//1+f7////6uHx////+9zq//7/8N7u////3+T4/v//1Of7//7/6uHx////+t3t//7/897v////4OX2/v//0ej9////5eP1////993s//7/9dzu////5eP1////0uj9////5eP1////9N3u////993s////5uLz/v//0+b8////3+T4////8d/v//7/+9zs////6uHx/v//1uf7////2+T4////79/x/////dvq//7/7eDx////2+b7////2ub7//7/7t/x//7//drr////79/x////3OX4////1+f7//7/6uHx//7/+9zs////897v/v//4OX2////1Ob8//7/5eP1//7/99zs////9dzu////5eP1/v//0uj9////5eP1////9N3u////993t////5eP1////0uj9////4OX2////897v////+tzt////6OH1/v//1+f7////3eX4//7/8N7u/////dvq////6uHx/v//1+f6////3OX4////7eDx/////dvq////79/x3OX4N2Ti////1+f7//7/6uHx////+9zs////897v/v//3uT4////1ef7////5uLz//7/+tzt////897v////4eT1////0uj9////5eP1////993s////993s////5eP1////0uj9////4OX2////897v////+t3t////6OH1////1+f7////3eX4//7/8N3v//7//drq////6uHx/v//1+f7////3OX4////7eDx//7//tro////7eDx////3OX4////1uf7////6uHx////+9zq////8N7u/v//3+T4////1ef7////6OH1//7/+t3t////897v////4OX2/v//0uj9////5eP1//7/993s////993s////5eP1/v//0ej9////4OX2////9N3u////+dzu////5uLz////1Ob8////3+T4//7/8d7v////+9zs////6uHx////1uf7////3OX4////79/x/////tvq//7/7eDx////3OX4////1+f7//7/6uHx////+9zq//7/8N7v/v//3+T4////1Ob7//7/5uLz////+t3t/6e59G+x9FZ88CeLomO4gEu+Tm/zD2/0bmnaPmLgwV6hrT6r/1Vx/yGDrV+vkkW5W23oImnsYWzlLGbptV6pnUO1/1Rv/x9/u16ko0CvZ2zeNGHjU2/tGWzwqGCzi0m8+lZ4+iaIyl6btjqodGrVRl3bRnD2CHL5mWK8eE7E7VeC6iqR01yTwjahgGbOUlnVPXD+AXX/kWTDa1LK5FiH2y+W4FqM1DCXjGXFZVLNOHD9AXn+g2fNWVjU11uSyjWg7FiC5ymQm2K7d07HRnD2B3L5dmjXR1zcyl6btzun/lV1/CSF6uHxjUe6V2zqHWrvZGviMWXmt16loUKx/1Nt/x9/t1+noEGxYmvnKmfpWmzoImnrrV+tkka3/1Vy/yGDwl+hrD6rb2naPWDfTGzyEG/0oWK3gEzA9Fh98SiK0VyVvzejfGfTTlnYQG78AXT+lGTCcFDH5lmG4C2U3FyP0TGbjWbEZVLMN3D+AHn/g2jNWVjT11uSyjWg7VeB5ymPm2O7eE7FRnD3BXL7eWjTS1zZ',ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const data=new Uint8Array(COUNT*6);
let bytes=0,bits=0,value=0;
for(const ch of PACKED){
 const n=ABC.indexOf(ch);if(n<0)continue;
 value=(value<<6)|n;bits+=6;
 if(bits>=8){bits-=8;data[bytes++]=(value>>>bits)&255;}
}
if(bytes!==COUNT*6)throw Error('Incomplete filmed palette track');
// The six-sector phase tracker is rotationally symmetric modulo 60deg.
 // Compare source-image sector centers to the two sampled colors to recover
 // WHICH parity of wedges is bright at each recorded clip time.
const PARITY='M5nNZDaT2UxmN5nNZDaT2UxmzWYym0ls3kwG';
const parity=new Uint8Array(Math.ceil(COUNT/8));
bits=0;value=0;bytes=0;
for(const ch of PARITY){
 const n=ABC.indexOf(ch);if(n<0)continue;
 value=(value<<6)|n;bits+=6;
 if(bits>=8){bits-=8;parity[bytes++]=(value>>>bits)&255;}
}
if(bytes!==parity.length)throw Error('Filmed wedge parity missing');
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
function frame(i,k){const o=i*6+k*3;return [data[o],data[o+1],data[o+2]];}
function at(videoSecond){
 const seconds=clip(videoSecond,START,START+(COUNT-1)/FPS);
 const pos=(seconds-START)*FPS,post=seconds>=POST_START;
 const split=Math.ceil((POST_START-START)*FPS);
 const min=post?split:0,max=post?COUNT-1:split-1;
 const a=clip(Math.floor(pos),min,max),b=clip(a+1,min,max),u=clip(pos-a,0,1);
 const color=k=>frame(a,k).map((x,i)=>Math.round(x+(frame(b,k)[i]-x)*u));
 const bright=color(0),dark=color(1);
 // drawBackdrop paints odd and even sectors in alternating palette slots.
 // Sector 0 takes slot 1: flip the slots when the filmed wedge was bright.
 const nearest=clip(Math.round(pos),0,COUNT-1);
 const sector0Bright=!!(parity[nearest>>3]&(1<<(nearest&7)));
 const first=sector0Bright?dark:bright,second=sector0Bright?bright:dark;
 return ['rgb('+first.join(',')+')','rgb('+second.join(',')+')'];
}
const API=Object.freeze({START,FPS,COUNT,POST_START,at});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHyper910FilmedPalette=API;
})(typeof window!=='undefined'?window:globalThis);
