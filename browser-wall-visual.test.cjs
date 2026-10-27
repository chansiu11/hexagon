'use strict';
// Render-test the actual canvas in Chromium, not just Game.sampleWalls().
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const times=[8,9,10,11,12,15,17,18,19,20,30,45,59];
const root=process.env.HEXAGON_URL||'http://127.0.0.1:4173/';
const dest=path.join(process.cwd(),'wall-browser-screenshots');
fs.mkdirSync(dest,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(root,{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.HexEngine?.Game&&window.HexCameraStability?.stabilizeCameraScale,{timeout:15000});
  for(let level=0;level<6;level++){
   await page.evaluate(async level=>{
    const response=await fetch('assets/timelines/waves-stage-'+level+'.json?v=8',{cache:'no-store'});
    if(!response.ok)throw Error('timeline download '+response.status);
    selected=level;
    game=new HexEngine.Game(level,await response.json());
    game.update=()=>{}; // Render-only deterministic frames, no forced collisions.
    settings.sound=false;settings.motion=true;
    screen='play';launch=null;
    document.body.classList.add('playing');
    game.time=0;game.sampleWalls();
    game.referenceCamera=game.recordedCamera;
   },level);
   let previousFrame=0;
   for(const time of times){
    const snapshot=await page.evaluate(({start,end})=>{
     const dt=1/60;
     for(let frame=start+1;frame<=end;frame++){
      game.time=frame/60;
      game.sampleWalls();
      game.referenceCamera=HexCameraStability.stabilizeCameraScale(
       game.referenceCamera,game.recordedCamera,dt);
     }
     return {
      actors:game.walls.length,
      time:game.time,
      camera:game.referenceCamera
     };
    },{start:previousFrame,end:time*60});
    previousFrame=time*60;
    assert(snapshot.actors>0,'no wall actors at stage '+(level+1)+' '+time+'s');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
    const image=await page.evaluate(()=>{
      const c=document.querySelector('#game'),context=c.getContext('2d');
      const swatch=document.createElement('canvas');swatch.width=swatch.height=1;
      const p=swatch.getContext('2d');
      p.fillStyle=palette()[2];p.fillRect(0,0,1,1);
      const rgb=p.getImageData(0,0,1,1).data;
      const pixels=context.getImageData(0,0,c.width,c.height).data;
      let wallColoredSamples=0;
      for(let y=65;y<535;y+=4)for(let x=25;x<935;x+=4){
       if(Math.hypot(x-480,y-300)<95)continue;
       const k=(y*c.width+x)*4;
       if(Math.abs(pixels[k]-rgb[0])<18&&
          Math.abs(pixels[k+1]-rgb[1])<18&&
          Math.abs(pixels[k+2]-rgb[2])<18)wallColoredSamples++;
      }
      return {wallColoredSamples};
    });
    assert(image.wallColoredSamples>20,
     'rendered wall color missing stage '+(level+1)+' time '+time+
     's ('+image.wallColoredSamples+' samples)');
    await page.screenshot({path:path.join(dest,'stage-'+(level+1)+'-'+time+'s.png')});
    console.log('PASS rendered stage '+(level+1)+' '+time+'s, '+snapshot.actors+
     ' actors, '+image.wallColoredSamples+' colored samples');
   }
  }
  assert.deepEqual(pageErrors,[],'browser JavaScript errors');
  console.log('PASS real Chromium canvas rendering on all six maps');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
