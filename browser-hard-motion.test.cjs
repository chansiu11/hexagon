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
  const stale=await p.evaluate(()=>{
   game=new HexHardMode.HardGame({duration:120,shapeSchedule:[[0,6]],groups:[{at:0,rate:1,tilt:0}],waves:[]});screen='play';settings.sound=false;last=2000;frame(1500);frame(2010);return {time:game.time,audio:songTime()};
  });
  assert(Math.abs(stale.time-.01*25/24)<1e-8&&Math.abs(stale.audio-.01)<1e-8,'a queued pre-start animation timestamp must never restore preparation time');
  const cues=await p.evaluate(()=>{
   settings.sound=false;selected=0;screen='play';game=new HexHardMode.HardGame({duration:6,shapeSchedule:[[0,6],[.5,5],[1.5,4],[2.5,5],[3.5,6]],groups:[{at:0,rate:1,tilt:0}],waves:[]});last=1000;music.beginRun();const calls=[],original=music.voice;music.voice=key=>{calls.push({key,sides:game.sides,progress:game.morph,time:game.time});return true};
   for(let i=1;i<=240;i++)frame(1000+i*1000/60);music.voice=original;return calls;
  });
  assert.deepEqual(cues.map(c=>c.key),['pentagon','square','pentagon','hexagon']);
  assert(cues.every(c=>c.progress<.15),'the spoken shape must start on the first visible morph frame');
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const time of [2,9.9,10.1,30,59.9,60.1,80]){
   const sample=await p.evaluate(t=>{game=new HexHardMode.HardGame(HexHardMode.create(19,120));game.time=t;game.sampleWalls();game.rotation=t*.5;game.zoom=HexHardMotion.zoomAt(t);game.referenceCamera=null;screen='play';uiAge=2;updatePalette(.1);draw();const m=HexHardMotion.cameraAt(t,game.rotation,game.zoom,game.timeline.groups);return {finite:m.every(Number.isFinite),det:m[0]*m[3]-m[1]*m[2]}},time);
   assert(sample.finite&&sample.det>0);await p.screenshot({path:`wall-browser-screenshots/hard-motion-${time}.png`});
  }
  for(const offset of [0,.06,.12,.18]){
   await p.evaluate(offset=>{settings.controlMode=2;game=new HexHardMode.HardGame({duration:5,shapeSchedule:[[0,6],[1,5]],groups:[{at:0,rate:0,tilt:0}],waves:[{id:'morph-preview',start:0,end:5,r:180,speed:0,thickness:30,sides:6,sectors:[0,1,2,4]}]});game.setControlMode(2);game.update((1+offset)/HexHardMotion.CLOCK_RATE,0);screen='play';launch=null;transition=null;flash=0;updatePalette(.1);draw()},offset);
   await p.screenshot({path:`wall-browser-screenshots/hard-fast-morph-${offset}.png`});
  }
  const perspective=await p.evaluate(()=>{
   const a=tiltProjection(0),b=tiltProjection(.24),c=tiltProjection(-.24);
   return {flat:a.compression,side:b.compression,back:c.compression,
    shear:b.shear,odd:backdropStripeCount(5),even:backdropStripeCount(6),
    mono:HexHexagonest.palette(125)};
  });
  assert.equal(perspective.flat,1);
  assert(perspective.side<=.31&&perspective.back<=.31,'tilt should look clearly side-on');
  assert(perspective.shear>.3,'tilt should also display an obvious slant');
  assert.equal(perspective.odd,10,'pentagon floor uses alternating ten rays');
  assert.equal(perspective.even,6,'hexagon floor keeps six broad stripes');
  assert.deepEqual(perspective.mono,[0,0,[0,24,100]],'late Hexagonest floor has two distinct colors');
  assert.deepEqual(errors,[]);console.log('PASS first-frame shape/voice sync and fast whole-world morph;');console.log('PASS measured HARD motion tiers, no lost time at 10/20/60 FPS, independent audio clock and shared stable world projection');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
