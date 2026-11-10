'use strict';
const assert=require('node:assert/strict');
const Hex=require('./hexagon-beat');
const Early=require('./hexagonest-beat-early');
const Mono=require('./hexagonest-beat-mono');
const Camera=require('./hexagonest-camera');
const Motion=require('./hard-motion');
assert.equal(Hex.SAMPLES,2761);
assert.equal(Early.SAMPLES,3487);
assert.equal(Mono.SAMPLES,1998);
assert.equal(Early.HZ,30);
assert.equal(Mono.HZ,10);
assert.equal(Mono.START,116.2);
assert.equal(Hex.PLAY_START,3.5);
const R=50*1.08*.8*Math.cos(Math.PI/6);
function pixelRadiusFromZoom(t){return Camera.at(t).zoom*R}
for(const [t,videoPx] of [[5,37],[8,40.5],[12,43.5],[125,35.75],[180,36],[250,34]]){
 const estimated=pixelRadiusFromZoom(t);
 assert(Math.abs(estimated-videoPx)<.9,'frame-derived source core radius '+t+'s: '+estimated);
}
for(const t of [.5,3,10,20,45,80]){
 const z=Motion.zoomAt(t*Motion.CLOCK_RATE);
 assert(Number.isFinite(z)&&z>.65&&z<1.65);
 const direct=Hex.zoom(t*Motion.CLOCK_RATE);
 assert(Math.abs(z-direct)<1e-10,'HARD world camera uses actual Hexagon 130BPM waveform');
}
function power(read,start,end,hz){
 const dt=1/30,times=[],values=[];
 for(let t=start;t<=end;t+=dt){times.push(t);values.push(read(t));}
 const N=times.length;const average=values.reduce((a,b)=>a+b,0)/N;
 let cos=0,sin=0;
 for(let i=0;i<N;i++){const theta=2*Math.PI*hz*times[i],y=values[i]-average;cos+=y*Math.cos(theta);sin+=y*Math.sin(theta);}
 return (cos*cos+sin*sin)/(N*N);
}
const hex130=power(t=>Hex.sourceRadius(t),8,70,130/60);
const hexWrong=power(t=>Hex.sourceRadius(t),8,70,1.8);
assert(hex130>hexWrong*15&&hex130>.3,'Hexagon source visibly pulses at 130 BPM');
const early174=power(t=>Early.radiusAt(t),8,51,174/60);
const earlyWrong=power(t=>Early.radiusAt(t),8,51,2.5);
assert(early174>earlyWrong*12&&early174>.4,'Hexagonest colored source pulses at ~174 BPM');
const mono60=power(t=>Mono.radiusAt(t),145,235,1);
const mono174=power(t=>Mono.radiusAt(t),145,235,174/60);
assert(mono60>mono174*10&&mono60>.3,'Hexagonest black-white source uses slow 1 Hz pulse');
assert(Math.abs(Camera.at(116.2).zoom-Mono.zoom(116.2))<1e-9,
 'black-white stage changes to video measured slow beat exactly at source cut');
for(const [get,start,end] of [[t=>Motion.zoomAt(t),0,95],
 [t=>Camera.at(t).zoom,.6,315.9]]){
 for(let t=start;t<=end;t+=.17)assert(Number.isFinite(get(t))&&get(t)>.5&&get(t)<2);
}
console.log('PASS source-video core pulses: HEXAGON 130BPM, HEXAGONEST 174BPM and monochrome 60BPM, preserved point hitbox/physics.');
