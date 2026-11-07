'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const p=await b.newPage({viewport:{width:960,height:600}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/');await p.evaluate(()=>{window.requestAnimationFrame=()=>0});await p.waitForTimeout(80);
  const rates=await p.evaluate(()=>{
   settings.sound=false;settings.motion=true;selected=0;screen='play';music.stop();launch=null;transition=null;flash=0;
   const result=[];for(const hz of [10,20,60]){game=new HexHardMode.HardGame({duration:120,shapeSchedule:[[0,6]],groups:[{at:0,rate:1,tilt:0}],waves:[]});last=1000;for(let i=1;i<=hz;i++)frame(1000+i*1000/hz);result.push({hz,time:game.time,audio:songTime(),rotation:game.rotation})}return result;
  });
  for(const r of rates){assert(Math.abs(r.time-25/24)<1e-7);assert(Math.abs(r.audio-1)<1e-7);assert(Math.abs(r.rotation-Math.PI/3*25/24)<1e-7)}
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const time of [2,9.9,10.1,30,59.9,60.1,80]){
   const sample=await p.evaluate(t=>{game=new HexHardMode.HardGame(HexHardMode.create(19,120));game.time=t;game.sampleWalls();game.rotation=t*.5;game.zoom=HexHardMotion.zoomAt(t);game.referenceCamera=null;screen='play';uiAge=2;updatePalette(.1);draw();const m=HexHardMotion.cameraAt(t,game.rotation,game.zoom,game.timeline.groups);return {finite:m.every(Number.isFinite),det:m[0]*m[3]-m[1]*m[2]}},time);
   assert(sample.finite&&sample.det>0);await p.screenshot({path:`wall-browser-screenshots/hard-motion-${time}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS measured HARD motion tiers, no lost time at 10/20/60 FPS, independent audio clock and shared stable world projection');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
