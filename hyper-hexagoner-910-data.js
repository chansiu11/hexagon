/* HYPER HEXAGONER video10 approximate optical tracking, tasks 9 & 10.
 * 404.40–489.0s in uploaded 1557(10).mp4 (576×360, 12fps).
 * 64 orbit occupancy peaks; camera core angular phase is sampled at 12Hz.
 * These numbers are OBSERVATIONS, not original Super Hexagon source code.
 * No copyrighted video, music or voice files are redistributed.
 */
(function(root){'use strict';
const RAW='044181n0e80y120g61g190jj05240mf0s1y0pk0z1e0sg0q1u1150c1j17e0k1z19t0m211dg0j1j1iz051r1jy071m1lv0s211os0o141y60y2a2120y1g29r0b242dm181b2g90s1u2io0b1f2jn0a1y2p605152uz0p1h2y315173180m2333e0h1y36s0y1t39x07223ct1d1b3f80d133l003123ri0k243uw1k233xs061j4160k2343c0k1z46h0a1w4a308134fv0d1i4j912224n40l1b4q809164t50p214wi08184yx181r52a022055f1g2158t0s1r5aq1d225dm021g5h00w1j5mk041u5qn1k245tb0z235w7081i5zc181i654081q6ao161a6dk10196gx101g6kb02256ng0g1k6qt1g13';
const CAMERA='3g3h3n3l2o241v262624251p2a25221y1u2024272c2i2s2q2j271t212g1i201y2b1v1t2f1t2x3c313t2o28252q2m2t2m25241z22221w2224241u2b1q23221y25212b1j221x26251t21241v2320291z1u2420252w382n222425212t2y2r2i1t24231x201y262o2s2r2n2c2c2t2x2s2u363t3k3f3f3m3l3e3j3t383n3q373c3y3e3j3g2i1i1t2v3c3m3b3t3c3i2r2q2s303k3c3r3i2o2b2x3d2o2d2x3g3c3h3w3l3f3i3i3f3u3f3f3k3g3m3e3e2s2m281w2125211v1x2c1x1y2e1w201y1v2i1x1y1z231v261z1x201z241q27281r2822272z3j2n221v1z1z1v22262q2s2r2h1x2a221n303o2n20241w1p1u1p1z2a2e231x222923262w352n25241z2c211o221n271w2b201t2423211u242x3j3j3k3k393l3e3i3k3i3o3f2z2q2l2z3o3f3h3q3c3l3i3h3i3y363n3i3l3m393p3i3t3r3f3f3x333g3m3e3o3g3d3r3o3k2r2o2s2z3n3f2k1u2n2h';
const HUES=[[0.0,226],[2.0,229],[4.0,241],[6.0,258],[8.0,278],[10.0,297],[12.0,306],[14.0,312],[16.0,310],[18.0,302],[20.0,286],[22.0,265],[24.0,248],[26.0,236],[28.0,229],[30.0,230],[32.0,239],[34.0,254],[36.0,272],[38.0,292],[40.0,304],[42.0,313],[44.0,315],[46.0,307],[48.0,292],[50.0,272],[52.0,253],[54.0,237],[56.0,227],[58.0,226],[60.0,311],[62.0,315],[64.0,319],[66.0,316],[68.0,307],[70.0,290],[72.0,270],[74.0,253],[76.0,240],[78.0,236],[80.0,238],[82.0,247],[84.0,264],[86.0,284],[88.0,334]],ZOOM=[104,101,97,96,95,98,101,106,104,108,100,100,95,100,99,103,108,106,104,100,98,95,96,97,102,104,107,103,102,100,97,97,98,101,104,108,103,100,97,95,95,98,103,105,105,103,101,98,98,95,102,101,105,105,106,102,96];
const decode=s=>parseInt(s,36);
const EVENTS=Object.freeze(Array.from({length:RAW.length/7},(_,i)=>{
 const v=RAW.slice(i*7,i*7+7),time=decode(v.slice(0,3))/100;
 return Object.freeze({id:i,time,mask:decode(v.slice(3,5)),width:decode(v.slice(5,7)),
  videoSecond:404.40+time*24/25});
}));
const PHASE=[1825];
for(let i=0;i<CAMERA.length;i+=2)PHASE.push(PHASE.at(-1)+decode(CAMERA.slice(i,i+2))-100);
const CAM_PERIOD=25/24/12,ZOOM_PERIOD=.5;
const linear=(arr,x)=>{const k=Math.max(0,Math.min(arr.length-1,x)),j=Math.floor(k),u=k-j;
 return arr[j]*(1-u)+arr[Math.min(arr.length-1,j+1)]*u;};
function cameraPost(t){return linear(PHASE,Math.max(0,t-60)/CAM_PERIOD)/100;}
function zoomPost(t){return linear(ZOOM,Math.max(0,t-60)/ZOOM_PERIOD)/100;}
function hueAt(t){let index=0;for(let i=1;i<HUES.length;i++)if(HUES[i][0]<=t)index=i;
 return HUES[index][1];}
if(EVENTS.length!==64||PHASE.length!==326)throw Error('Malformed HYPER HEXAGONER video10 data');
const API=Object.freeze({EVENTS,PHASE,HUES,ZOOM,cameraPost,zoomPost,hueAt,
 VIDEO_START:404.4,VIDEO_END:489,GAME_RATE:25/24,REFERENCE_GAME_END:88.04,
 SOURCE:'1557(10).mp4',IS_APPROXIMATE:true});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHyper910Data=API;
})(typeof window!=='undefined'?window:globalThis);